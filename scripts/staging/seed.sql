\set ON_ERROR_STOP on
-- One million synthetic registered profiles, plus an active social workload.
INSERT INTO conversations(user_id,traits)
SELECT 'fixture-user-'||n,jsonb_build_object('fixture',true,'name','Synthetic member '||n)
FROM generate_series(1,1000000) n ON CONFLICT(user_id) DO NOTHING;
INSERT INTO conversations(user_id,traits,updated_at)
SELECT 'fixture-user-'||n||'::social::post::post-'||n,
  jsonb_build_object('kind','social-post','id','post-'||n,'authorId','fixture-user-'||n,
  'authorName','Synthetic member','ai',false,'content','Staging-only post '||n,
  'createdAt',now()-n*interval '1 second','format','post','image',null),
  now()-n*interval '1 second'
FROM generate_series(1,10000) n ON CONFLICT(user_id) DO NOTHING;
INSERT INTO conversations(user_id,traits)
SELECT 'fixture-user-'||(n+10000)||'::social::like::post-'||((n%1000)+1),
 jsonb_build_object('kind','social-like','postId','post-'||((n%1000)+1),'authorId','fixture-user-'||(n+10000),'active',true)
FROM generate_series(1,100000) n ON CONFLICT(user_id) DO NOTHING;
ANALYZE;
SELECT count(*) total_rows FROM conversations;
SELECT count(*) profiles FROM conversations WHERE user_id NOT LIKE '%::%';
