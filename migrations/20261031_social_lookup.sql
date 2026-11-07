-- Avoid scanning every post for an empty or small Saved feed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE INDEX IF NOT EXISTS rico_social_saved_owner
  ON public.conversations ((traits->>'authorId'), (traits->>'postId'))
  WHERE traits->>'kind' = 'social-save' AND traits->>'active' = 'true';
CREATE INDEX IF NOT EXISTS rico_social_cleanup_queue
  ON public.conversations ((traits->>'queuedAt'))
  WHERE traits->>'kind' = 'social-media-cleanup';

CREATE OR REPLACE FUNCTION public.rico_social_page(p_user text, p_filter text, p_author text, p_before timestamptz, p_key text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_filter = 'saved' THEN
    RETURN (
      WITH saved AS MATERIALIZED (
        SELECT s.traits->>'postId' AS post_id FROM public.conversations s
        WHERE s.traits->>'kind' = 'social-save' AND s.traits->>'active' = 'true'
          AND s.traits->>'authorId' = p_user
          AND s.user_id = p_user || '::social::save::' || (s.traits->>'postId')
      )
      SELECT coalesce(jsonb_agg(jsonb_build_object('traits', social_metadata, 'updated_at', updated_at, 'user_id', user_id)
        ORDER BY updated_at DESC, user_id DESC), '[]'::jsonb)
      FROM (
        SELECT c.social_metadata, c.updated_at, c.user_id
        FROM saved s JOIN public.conversations c ON c.traits->>'id' = s.post_id
        WHERE c.traits->>'kind' = 'social-post' AND coalesce(c.traits->>'format', 'post') <> 'story'
          AND (p_author IS NULL OR c.traits->>'authorId' = p_author)
          AND (p_before IS NULL OR (c.updated_at, c.user_id) < (p_before, p_key))
        ORDER BY c.updated_at DESC, c.user_id DESC LIMIT 13
      ) page
    );
  END IF;
  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object('traits', social_metadata, 'updated_at', updated_at, 'user_id', user_id)
      ORDER BY updated_at DESC, user_id DESC), '[]'::jsonb)
    FROM (
      SELECT c.social_metadata, c.updated_at, c.user_id FROM public.conversations c
      WHERE c.traits->>'kind' = 'social-post' AND coalesce(c.traits->>'format', 'post') <> 'story'
        AND (p_author IS NULL OR c.traits->>'authorId' = p_author)
        AND (p_filter NOT IN ('ai', 'members') OR c.traits->>'ai' = CASE WHEN p_filter = 'ai' THEN 'true' ELSE 'false' END)
        AND (p_before IS NULL OR (c.updated_at, c.user_id) < (p_before, p_key))
      ORDER BY c.updated_at DESC, c.user_id DESC LIMIT 13
    ) page
  );
END $$;
REVOKE ALL ON FUNCTION public.rico_social_page(text,text,text,timestamptz,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rico_social_page(text,text,text,timestamptz,text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
