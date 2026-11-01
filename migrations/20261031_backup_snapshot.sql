-- One consistent application-data snapshot. No browser role can call this RPC.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION public.rico_backup_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object(
  'format','ricomates-application-data-v2', 'createdAt',now(),
  'tables',jsonb_build_object(
   'users',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.users t),
   'conversations',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.conversations t),
   'career_results',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.career_results t),
   'rico_social_counts',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') FROM public.rico_social_counts t)),
  'storageObjects',(SELECT coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'name',name,'updatedAt',updated_at) ORDER BY name),'[]') FROM storage.objects WHERE bucket_id='rico-social-photos'),
  'scope','Application records, social counters and private social photos. Excludes Clerk identities, external voice providers, temporary rate limits/leases and infrastructure secrets.'
 );
$$;
REVOKE ALL ON FUNCTION public.rico_backup_snapshot() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rico_backup_snapshot() TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
