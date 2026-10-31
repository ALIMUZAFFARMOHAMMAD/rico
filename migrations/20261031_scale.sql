-- Run on a restored staging database first, then in a maintenance window.
-- Abort on ambiguous keys: never delete or merge customer rows automatically.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
LOCK TABLE public.conversations IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.conversations GROUP BY user_id HAVING count(*) > 1)
     OR EXISTS (SELECT 1 FROM public.conversations WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'Resolve duplicate/null conversation keys before migration; no data changed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.conversations WHERE updated_at IS NULL AND traits->>'kind' IN ('social-post','social-comment')) THEN
    RAISE EXCEPTION 'Repair missing social timestamps before cursor pagination is enabled';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS rico_conversation_key ON public.conversations(user_id);
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS social_metadata jsonb;

CREATE TABLE IF NOT EXISTS public.rico_limits (
  key text PRIMARY KEY, hits bigint NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rico_limits_expiry ON public.rico_limits(expires_at);
CREATE TABLE IF NOT EXISTS public.rico_leases (
  key text PRIMARY KEY, token uuid NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rico_leases_expiry ON public.rico_leases(expires_at);
CREATE TABLE IF NOT EXISTS public.rico_social_counts (
  post_id text NOT NULL, shard integer NOT NULL,
  likes bigint NOT NULL DEFAULT 0, comments bigint NOT NULL DEFAULT 0,
  PRIMARY KEY(post_id, shard), CHECK (likes >= 0 AND comments >= 0)
);
ALTER TABLE public.rico_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rico_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rico_social_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rico_limits, public.rico_leases, public.rico_social_counts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rico_limits, public.rico_leases, public.rico_social_counts TO service_role;

CREATE OR REPLACE FUNCTION public.rico_rate_limit(p_key text, p_limit integer, p_window_ms integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n bigint; t timestamptz := clock_timestamp();
BEGIN
  IF p_limit < 1 OR p_window_ms < 1 OR p_window_ms > 86400000 OR length(p_key) > 300 THEN RETURN false; END IF;
  INSERT INTO public.rico_limits AS l VALUES(p_key, 1, t + p_window_ms * interval '1 millisecond')
  ON CONFLICT(key) DO UPDATE SET
    hits = CASE WHEN l.expires_at <= t THEN 1 ELSE least(l.hits + 1, p_limit + 1) END,
    expires_at = CASE WHEN l.expires_at <= t THEN EXCLUDED.expires_at ELSE l.expires_at END
  RETURNING hits INTO n;
  -- Amortized TTL cleanup under traffic; the daily cron is only a backstop.
  IF random() < 0.01 THEN
    DELETE FROM public.rico_limits WHERE key IN (
      SELECT key FROM public.rico_limits WHERE expires_at < t - interval '1 hour'
      ORDER BY expires_at LIMIT 1000 FOR UPDATE SKIP LOCKED
    );
  END IF;
  RETURN n <= p_limit;
END $$;

CREATE OR REPLACE FUNCTION public.rico_lease(p_key text, p_token uuid, p_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE acquired uuid;
BEGIN
  IF p_seconds NOT BETWEEN 1 AND 600 THEN RETURN false; END IF;
  INSERT INTO public.rico_leases AS l VALUES(p_key, p_token, clock_timestamp() + p_seconds * interval '1 second')
  ON CONFLICT(key) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at
  WHERE l.expires_at <= clock_timestamp() RETURNING token INTO acquired;
  RETURN acquired IS NOT NULL;
END $$;

CREATE OR REPLACE FUNCTION public.rico_release_lease(p_key text, p_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  DELETE FROM public.rico_leases WHERE key = p_key AND token = p_token;
$$;

CREATE OR REPLACE FUNCTION public.rico_provider_admit(p_token uuid, p_daily_limit integer, p_concurrency integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_daily_limit < 1 OR p_concurrency < 1 THEN RETURN false; END IF;
  -- Serialize only admission, never hold a database transaction during HTTP.
  PERFORM pg_advisory_xact_lock(hashtextextended('rico:provider-admission', 0));
  DELETE FROM public.rico_leases WHERE key LIKE 'provider:%' AND expires_at <= clock_timestamp();
  IF (SELECT count(*) FROM public.rico_leases WHERE key LIKE 'provider:%') >= p_concurrency THEN RETURN false; END IF;
  IF NOT public.rico_rate_limit('provider:day:' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD'), p_daily_limit, 86400000) THEN RETURN false; END IF;
  INSERT INTO public.rico_leases VALUES('provider:' || p_token, p_token, clock_timestamp() + interval '120 seconds');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.rico_upsert(p_key text, p_fields jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE r public.conversations%ROWTYPE; proposed public.conversations%ROWTYPE;
BEGIN
  -- Insert-or-lock works for both new and existing rows, including concurrent creates.
  INSERT INTO public.conversations(user_id, messages, traits, riasec, msg_count, voice_notes)
    VALUES(p_key, '[]', '{}', '', 0, '[]') ON CONFLICT(user_id) DO NOTHING;
  SELECT * INTO r FROM public.conversations WHERE user_id = p_key FOR UPDATE;
  SELECT * INTO proposed FROM jsonb_populate_record(r, p_fields - 'user_id' - 'id' - 'social_metadata');
  UPDATE public.conversations SET messages = proposed.messages, traits = proposed.traits,
    riasec = proposed.riasec, msg_count = proposed.msg_count, voice_notes = proposed.voice_notes,
    updated_at = clock_timestamp() WHERE user_id = p_key RETURNING * INTO r;
  RETURN jsonb_build_object('updated_at', r.updated_at);
END $$;

CREATE OR REPLACE FUNCTION public.rico_save_conversation(p_key text, p_fields jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE r public.conversations%ROWTYPE; old_messages jsonb; incoming jsonb := p_fields->'messages'; old_count integer; new_count integer;
BEGIN
  INSERT INTO public.conversations(user_id, messages, traits, riasec, msg_count, voice_notes)
    VALUES(p_key, '[]', '{}', '', 0, '[]') ON CONFLICT(user_id) DO NOTHING;
  SELECT * INTO r FROM public.conversations WHERE user_id = p_key FOR UPDATE;
  old_messages := coalesce(r.messages::jsonb, '[]');
  old_count := jsonb_array_length(old_messages); new_count := jsonb_array_length(incoming);
  -- A full-history save may extend the stored history, never replace a branch
  -- from another tab. A retry of an already committed prefix is a no-op.
  IF EXISTS (SELECT 1 FROM generate_series(0, least(old_count,new_count)-1) AS g(i)
    WHERE old_messages->i IS DISTINCT FROM incoming->i) THEN RETURN false; END IF;
  IF new_count < old_count THEN RETURN true; END IF;
  PERFORM public.rico_upsert(p_key, p_fields || jsonb_build_object('traits', coalesce(r.traits::jsonb,'{}') || coalesce(p_fields->'traits','{}')));
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.rico_club_mutate(p_key text, p_mutation jsonb, p_lease uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE r public.conversations%ROWTYPE; items jsonb; target jsonb; reactions jsonb; people jsonb; stamp jsonb := '{}';
BEGIN
  IF p_lease IS NOT NULL THEN
    PERFORM 1 FROM public.rico_leases WHERE key = 'club:' || p_key AND token = p_lease AND expires_at > clock_timestamp() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Generation lease expired'; END IF;
  END IF;
  INSERT INTO public.conversations(user_id, messages, traits, riasec, msg_count, voice_notes)
    VALUES(p_key, '[]', '{}', '', 0, '[]') ON CONFLICT(user_id) DO NOTHING;
  SELECT * INTO r FROM public.conversations WHERE user_id = p_key FOR UPDATE;
  items := coalesce(r.messages::jsonb, '[]');
  IF p_mutation->>'action' = 'append' THEN
    IF p_mutation->>'parentId' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(items) e WHERE e->>'id' = p_mutation->>'parentId') THEN
      RAISE EXCEPTION 'Parent post removed';
    END IF;
    SELECT coalesce(jsonb_agg(e ORDER BY n), '[]') INTO items FROM (
      SELECT e,n FROM jsonb_array_elements(items || (p_mutation->'items')) WITH ORDINALITY a(e,n)
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(items) x WHERE x->>'id' = e->>'id') OR n <= jsonb_array_length(items)
      ORDER BY n DESC LIMIT 100
    ) bounded;
    IF p_lease IS NOT NULL THEN stamp := jsonb_build_object('lastGeneratedAt', clock_timestamp()); END IF;
  ELSIF p_mutation->>'action' = 'react' THEN
    SELECT e INTO target FROM jsonb_array_elements(items) e WHERE e->>'id' = p_mutation->>'itemId';
    IF target IS NULL THEN RAISE EXCEPTION 'Post removed'; END IF;
    reactions := coalesce(target->'reactions', '{}'); people := coalesce(reactions->(p_mutation->>'emoji'), '[]');
    IF people ? (p_mutation->>'reactorId') THEN
      SELECT coalesce(jsonb_agg(e), '[]') INTO people FROM jsonb_array_elements(people) e WHERE e #>> '{}' <> p_mutation->>'reactorId';
    ELSE people := people || jsonb_build_array(p_mutation->>'reactorId'); END IF;
    target := target || jsonb_build_object('reactions', reactions || jsonb_build_object(p_mutation->>'emoji', people));
    SELECT jsonb_agg(CASE WHEN e->>'id' = p_mutation->>'itemId' THEN target ELSE e END ORDER BY n) INTO items FROM jsonb_array_elements(items) WITH ORDINALITY a(e,n);
  ELSE RAISE EXCEPTION 'Unknown club mutation'; END IF;
  PERFORM public.rico_upsert(p_key, jsonb_build_object('messages', items, 'traits', coalesce(r.traits::jsonb, '{}') || stamp));
  RETURN items;
END $$;

CREATE OR REPLACE FUNCTION public.rico_insert_once(p_key text, p_traits jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE result jsonb;
BEGIN
  INSERT INTO public.conversations(user_id, messages, traits, riasec, msg_count, voice_notes, updated_at)
    VALUES(p_key, '[]', p_traits, '', 0, '[]', clock_timestamp()) ON CONFLICT(user_id) DO NOTHING;
  SELECT traits::jsonb INTO result FROM public.conversations WHERE user_id = p_key;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.rico_publish_daily(p_posts jsonb, p_key text, p_lease uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE post jsonb;
BEGIN
  PERFORM 1 FROM public.rico_leases WHERE key = p_key AND token = p_lease AND expires_at > clock_timestamp() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Daily generation lease expired'; END IF;
  IF jsonb_array_length(p_posts) > 4 THEN RAISE EXCEPTION 'Daily post limit exceeded'; END IF;
  FOR post IN SELECT * FROM jsonb_array_elements(p_posts) LOOP
    PERFORM public.rico_insert_once('social-ai::social::post::' || (post->>'id'), post || '{"kind":"social-post","ai":true}'::jsonb);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rico_social_metadata_trigger()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.social_metadata := CASE WHEN NEW.traits->>'kind' = 'social-post'
    THEN (NEW.traits::jsonb - 'image') || jsonb_build_object('hasImage', coalesce(NEW.traits->>'image','') <> '') ELSE NULL END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rico_social_metadata_update ON public.conversations;
CREATE TRIGGER rico_social_metadata_update BEFORE INSERT OR UPDATE OF traits ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.rico_social_metadata_trigger();
-- The existing app has a timestamp-only trigger on every update. Skip only that
-- verified trigger during the metadata backfill, under the table write lock,
-- so feed ordering and original updated_at values remain unchanged. Transaction
-- rollback also restores trigger state if any subsequent statement fails.
DO $$ DECLARE skip_timestamp boolean := false; BEGIN
  SELECT t.tgenabled = 'O' AND lower(regexp_replace(p.prosrc, '[[:space:]]', '', 'g')) = 'beginnew.updated_at=now();returnnew;end;'
  INTO skip_timestamp FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'public.conversations'::regclass AND t.tgname = 'update_conversations_updated_at';
  IF skip_timestamp THEN ALTER TABLE public.conversations DISABLE TRIGGER update_conversations_updated_at; END IF;
  UPDATE public.conversations SET social_metadata = (traits::jsonb - 'image') || jsonb_build_object('hasImage', coalesce(traits->>'image','') <> '') WHERE traits->>'kind' = 'social-post';
  IF skip_timestamp THEN ALTER TABLE public.conversations ENABLE TRIGGER update_conversations_updated_at; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rico_social_counter_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE old_t jsonb := '{}'; new_t jsonb := '{}'; old_key text := ''; new_key text := ''; change record;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_t := OLD.traits::jsonb; old_key := OLD.user_id; END IF;
  IF TG_OP <> 'DELETE' THEN new_t := NEW.traits::jsonb; new_key := NEW.user_id; END IF;
  -- Shard hot-post counters to distribute writers; readers sum at most 32 rows.
  FOR change IN SELECT t->>'postId' AS post_id, (hashtextextended(k,0) & 31)::integer AS shard,
    sum(CASE WHEN t->>'kind' = 'social-like' AND t->>'active' = 'true' THEN delta ELSE 0 END) AS likes,
    sum(CASE WHEN t->>'kind' = 'social-comment' THEN delta ELSE 0 END) AS comments
  FROM (VALUES(old_t,old_key,-1),(new_t,new_key,1)) AS changes(t,k,delta)
  WHERE t->>'postId' IS NOT NULL AND t->>'kind' IN ('social-like','social-comment')
  GROUP BY 1,2 ORDER BY 1,2 LOOP
    INSERT INTO public.rico_social_counts(post_id,shard) VALUES(change.post_id, change.shard) ON CONFLICT DO NOTHING;
    UPDATE public.rico_social_counts SET likes = likes + change.likes, comments = comments + change.comments
      WHERE post_id = change.post_id AND shard = change.shard;
  END LOOP;
  RETURN NULL;
END $$;
-- Backfill under the same lock as trigger installation; no lost increments.
TRUNCATE public.rico_social_counts;
INSERT INTO public.rico_social_counts(post_id, shard, likes, comments)
SELECT traits->>'postId', (hashtextextended(user_id,0) & 31)::integer,
  count(*) FILTER (WHERE traits->>'kind' = 'social-like' AND traits->>'active' = 'true'),
  count(*) FILTER (WHERE traits->>'kind' = 'social-comment')
FROM public.conversations WHERE traits->>'kind' IN ('social-like','social-comment') AND traits->>'postId' IS NOT NULL GROUP BY 1,2;
DROP TRIGGER IF EXISTS rico_social_count_update ON public.conversations;
CREATE TRIGGER rico_social_count_update AFTER INSERT OR UPDATE OR DELETE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.rico_social_counter_trigger();

CREATE INDEX IF NOT EXISTS rico_social_feed_page ON public.conversations(updated_at DESC, user_id DESC) WHERE traits->>'kind' = 'social-post';
CREATE INDEX IF NOT EXISTS rico_social_post_id ON public.conversations((traits->>'id')) WHERE traits->>'kind' = 'social-post';
CREATE INDEX IF NOT EXISTS rico_social_interactions ON public.conversations((traits->>'postId'), (traits->>'kind'), updated_at DESC) WHERE traits->>'kind' IN ('social-like','social-comment','social-save');
CREATE INDEX IF NOT EXISTS rico_social_author_feed ON public.conversations((traits->>'authorId'), updated_at DESC, user_id DESC) WHERE traits->>'kind' = 'social-post';
CREATE INDEX IF NOT EXISTS rico_social_audience_feed ON public.conversations((traits->>'ai'), updated_at DESC, user_id DESC) WHERE traits->>'kind' = 'social-post';
CREATE INDEX IF NOT EXISTS rico_social_expiry ON public.conversations((traits->>'storyExpiresAt')) WHERE traits->>'kind' = 'social-post';
CREATE INDEX IF NOT EXISTS rico_social_created ON public.conversations((traits->>'createdAt')) WHERE traits->>'kind' = 'social-post' AND traits->>'ai' = 'true';
CREATE INDEX IF NOT EXISTS rico_social_comment_page ON public.conversations((traits->>'postId'), updated_at DESC, user_id DESC) WHERE traits->>'kind' = 'social-comment';

CREATE OR REPLACE FUNCTION public.rico_social_activity(p_ids text[], p_user text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(jsonb_object_agg(id, jsonb_build_object('likes', coalesce(likes,0), 'comments', coalesce(comments,0),
    'liked', coalesce((SELECT traits->>'active' = 'true' FROM public.conversations WHERE user_id = p_user || '::social::like::' || totals.id), false),
    'saved', coalesce((SELECT traits->>'active' = 'true' FROM public.conversations WHERE user_id = p_user || '::social::save::' || totals.id), false))), '{}')
  FROM (SELECT id, sum(c.likes) likes, sum(c.comments) comments FROM unnest(p_ids[1:100]) id LEFT JOIN public.rico_social_counts c ON c.post_id = id GROUP BY id) totals;
$$;

CREATE OR REPLACE FUNCTION public.rico_social_page(p_user text, p_filter text, p_author text, p_before timestamptz, p_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('traits', social_metadata, 'updated_at', updated_at, 'user_id', user_id) ORDER BY updated_at DESC, user_id DESC), '[]') FROM (
    SELECT c.social_metadata, c.updated_at, c.user_id FROM public.conversations c
    WHERE c.traits->>'kind' = 'social-post' AND coalesce(c.traits->>'format', 'post') <> 'story'
      AND (p_author IS NULL OR c.traits->>'authorId' = p_author)
      AND (p_filter NOT IN ('ai','members') OR c.traits->>'ai' = CASE WHEN p_filter = 'ai' THEN 'true' ELSE 'false' END)
      AND (p_before IS NULL OR (c.updated_at,c.user_id) < (p_before,p_key))
      AND (p_filter <> 'saved' OR EXISTS(SELECT 1 FROM public.conversations s WHERE s.user_id = p_user || '::social::save::' || (c.traits->>'id') AND s.traits->>'active' = 'true'))
    ORDER BY c.updated_at DESC, c.user_id DESC LIMIT 13
  ) page;
$$;

CREATE OR REPLACE FUNCTION public.rico_social_comments(p_post text, p_before timestamptz, p_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('traits', traits, 'updated_at', updated_at, 'user_id', user_id) ORDER BY updated_at DESC, user_id DESC), '[]') FROM (
    SELECT c.traits, c.updated_at, c.user_id FROM public.conversations c
    WHERE c.traits->>'kind' = 'social-comment' AND c.traits->>'postId' = p_post
      AND (p_before IS NULL OR (c.updated_at,c.user_id) < (p_before,p_key))
    ORDER BY c.updated_at DESC, c.user_id DESC LIMIT 21
  ) comments;
$$;

CREATE OR REPLACE FUNCTION public.rico_social_stories()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(jsonb_agg(social_metadata ORDER BY updated_at DESC), '[]') FROM (
    SELECT social_metadata, updated_at FROM public.conversations WHERE traits->>'kind' = 'social-post'
    AND (traits->>'storyExpiresAt' > to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      OR (traits->>'ai' = 'true' AND traits->>'createdAt' > to_char((now() - interval '24 hours') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
    ORDER BY updated_at DESC LIMIT 100
  ) stories;
$$;

CREATE OR REPLACE FUNCTION public.rico_cleanup()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM public.rico_limits WHERE key IN (SELECT key FROM public.rico_limits WHERE expires_at < now() - interval '1 hour' LIMIT 10000);
  DELETE FROM public.rico_leases WHERE key IN (SELECT key FROM public.rico_leases WHERE expires_at < now() LIMIT 10000);
END $$;
-- No browser/anonymous execution: every RPC is called by authenticated server code.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'rico_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
