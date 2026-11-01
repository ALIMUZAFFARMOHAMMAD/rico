const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const docker='docker';
const root=path.resolve(__dirname,'../..');
function sql(text){const r=spawnSync(docker,['compose','-f','scripts/staging/compose.yaml','exec','-T','db','psql','-X','-v','ON_ERROR_STOP=1','-U','staging_admin','-d','rico_staging'],{cwd:root,input:text,encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr);return r.stdout;}
// Deliberately reproduce the legacy permission flaw in a rolled-back local transaction.
const migration=fs.readFileSync(path.join(root,'migrations/20261031_private_tables.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
const test=`BEGIN;
CREATE TABLE IF NOT EXISTS public.users(id uuid DEFAULT gen_random_uuid(), label text);
CREATE TABLE IF NOT EXISTS public.career_results(id uuid DEFAULT gen_random_uuid(), label text);
GRANT ALL ON public.users,public.career_results TO service_role;
GRANT SELECT ON public.users,public.career_results,public.conversations TO anon,authenticated;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_public_read ON public.users FOR SELECT TO PUBLIC USING (true);
CREATE POLICY fixture_public_read ON public.career_results FOR SELECT TO PUBLIC USING (true);
CREATE POLICY fixture_public_read ON public.conversations FOR SELECT TO PUBLIC USING (true);
CREATE TEMP TABLE snapshot AS SELECT count(*) n,md5(string_agg(md5(to_jsonb(c)::text),'' ORDER BY user_id)) fingerprint FROM public.conversations c;
${migration}
DO $$ DECLARE target text; role_name text; allowed boolean; before_row record; after_row record; BEGIN
 FOREACH target IN ARRAY ARRAY['users','conversations','career_results'] LOOP
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(role_name,'public.'||target,'SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Browser grant remains'; END IF;
   EXECUTE format('SET LOCAL ROLE %I',role_name);
   allowed:=false;
   BEGIN EXECUTE format('SELECT count(*) FROM public.%I',target); allowed:=true; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
   RESET ROLE;
   IF allowed THEN RAISE EXCEPTION 'Direct read unexpectedly allowed'; END IF;
  END LOOP;
 END LOOP;
 SELECT * INTO before_row FROM snapshot;
 SELECT count(*) n,md5(string_agg(md5(to_jsonb(c)::text),'' ORDER BY user_id)) fingerprint INTO after_row FROM public.conversations c;
 IF before_row IS DISTINCT FROM after_row THEN RAISE EXCEPTION 'Records changed'; END IF;
 SET LOCAL ROLE service_role;
 PERFORM count(*) FROM public.conversations;
 RESET ROLE;
 RAISE NOTICE 'PASS: 6 direct browser reads denied; server read succeeds; all fixture records unchanged';
END $$;
ROLLBACK;`;
console.log(sql(test));
console.log('PASS private table permission test on real PostgreSQL; temporary policy changes rolled back');
