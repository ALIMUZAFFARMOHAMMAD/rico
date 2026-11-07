-- READ ONLY. Run in the Supabase SQL editor before the scale migration.
-- Returns schema/count metadata, never messages, names, keys or voice data.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SELECT column_name, data_type, is_nullable, column_default IS NOT NULL AS has_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'conversations'
ORDER BY ordinal_position;
SELECT count(*) AS duplicate_key_groups FROM (
  SELECT user_id FROM public.conversations GROUP BY user_id HAVING count(*) > 1
) duplicates;
SELECT count(*) AS null_keys FROM public.conversations WHERE user_id IS NULL;
SELECT count(*) AS missing_social_timestamps FROM public.conversations
WHERE updated_at IS NULL AND traits->>'kind' IN ('social-post','social-comment');
SELECT relrowsecurity AS conversations_rls_enabled,
  pg_size_pretty(pg_total_relation_size(oid)) AS table_and_index_size
FROM pg_class WHERE oid = 'public.conversations'::regclass;
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'conversations';
SELECT rolname AS browser_role,
  has_table_privilege(rolname, 'public.conversations', 'SELECT') AS can_select,
  has_table_privilege(rolname, 'public.conversations', 'INSERT') AS can_insert,
  has_table_privilege(rolname, 'public.conversations', 'UPDATE') AS can_update
FROM pg_roles WHERE rolname IN ('anon','authenticated');
SELECT policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations';
COMMIT;
