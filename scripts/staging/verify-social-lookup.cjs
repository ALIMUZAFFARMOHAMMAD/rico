// Isolated PostgreSQL only. Applies the reviewed index/function migration, then
// rolls back all verification fixtures. Never reads production credentials.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
function sql(input){const r=spawnSync('docker',['compose','-f',path.join(__dirname,'compose.yaml'),'exec','-T','db','psql','-X','-v','ON_ERROR_STOP=1','-U','staging_admin','-d','rico_staging','-At'],{cwd:root,input,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});if(r.status!==0)throw Error(r.stderr);return r.stdout;}
// EXPLAIN exposes both planner execution time and shared buffers without rows.
const plan=`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT public.rico_social_page('fixture-empty-saved','saved',null,null,null);`;
const before=sql(plan);
sql(fs.readFileSync(path.join(root,'migrations/20261031_social_lookup.sql'),'utf8'));
const after=sql(plan);
sql(`BEGIN;
INSERT INTO conversations(user_id,traits) SELECT 'fixture-lookup-owner::social::save::post-'||n,
jsonb_build_object('kind','social-save','postId','post-'||n,'authorId','fixture-lookup-owner','active',true) FROM generate_series(1,25)n;
INSERT INTO conversations(user_id,traits) VALUES
('fixture-other-owner::social::save::post-26','{"kind":"social-save","postId":"post-26","authorId":"fixture-lookup-owner","active":true}'),
('fixture-lookup-owner::social::save::post-27','{"kind":"social-save","postId":"post-27","authorId":"fixture-lookup-owner","active":false}');
DO $$ DECLARE first_page jsonb; second_page jsonb; last_item jsonb; BEGIN
 first_page:=rico_social_page('fixture-lookup-owner','saved',null,null,null);
 IF jsonb_array_length(first_page)<>13 THEN RAISE EXCEPTION 'First page not bounded'; END IF;
 last_item:=first_page->12;
 second_page:=rico_social_page('fixture-lookup-owner','saved',null,(last_item->>'updated_at')::timestamptz,last_item->>'user_id');
 IF jsonb_array_length(second_page)<>12 THEN RAISE EXCEPTION 'Second page wrong size'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(first_page)a JOIN jsonb_array_elements(second_page)b ON a->>'user_id'=b->>'user_id') THEN RAISE EXCEPTION 'Repeated cursor results'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(first_page||second_page)a WHERE a->'traits'->>'id' IN ('post-26','post-27')) THEN RAISE EXCEPTION 'Inactive or malformed owner included'; END IF;
 IF rico_social_page('fixture-unrelated-owner','saved',null,null,null)<>'[]'::jsonb THEN RAISE EXCEPTION 'Cross-owner leak'; END IF;
 IF jsonb_array_length(rico_social_page('fixture-lookup-owner','saved','fixture-user-1',null,null))<>1 THEN RAISE EXCEPTION 'Author filter wrong'; END IF;
 IF has_function_privilege('anon','rico_social_page(text,text,text,timestamptz,text)','EXECUTE') OR has_function_privilege('authenticated','rico_social_page(text,text,text,timestamptz,text)','EXECUTE') THEN RAISE EXCEPTION 'Browser RPC access'; END IF;
END $$;
ROLLBACK;`);
const results={before:JSON.parse(before),after:JSON.parse(after),checks:['bounded page','disjoint cursor','inactive excluded','owner key verified','cross-owner isolation','author filter','RPC server-only']};
fs.writeFileSync(path.join(__dirname,'results/social-lookup.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify({passed:results.checks.length,beforeMs:results.before[0]['Execution Time'],afterMs:results.after[0]['Execution Time'],beforeBuffers:results.before[0].Plan['Shared Hit Blocks'],afterBuffers:results.after[0].Plan['Shared Hit Blocks']}));
