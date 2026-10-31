// Offline PostgreSQL execution. No HTTP, model calls, or production credentials.
// Install @electric-sql/pglite in a separate tools folder; pass PGLITE_MODULE.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const migration = fs.readFileSync(path.join(__dirname,'../migrations/20261031_scale.sql'),'utf8');
const schema = `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE public.conversations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id text,messages jsonb DEFAULT '[]',traits jsonb DEFAULT '{}',riasec text DEFAULT '',msg_count integer DEFAULT 0,voice_notes jsonb DEFAULT '[]',updated_at timestamptz DEFAULT now());`;
async function main() {
  const db = new PGlite();
  await db.exec(schema);
  await db.exec(migration);
  let passed = 0;
  async function check(name, run) { await run(); passed++; console.log('PASS '+name); }
  async function rpc(name,args) {
    const values=Object.values(args), names=Object.keys(args);
    const {rows}=await db.query(`SELECT public.rico_${name}(${names.map((n,i)=>`${n} => $${i+1}`).join(',')}) AS result`,values);
    return rows[0].result;
  }
  const row=async key=>(await db.query('SELECT * FROM conversations WHERE user_id=$1',[key])).rows[0];
  await check('atomic partial upserts preserve unrelated columns and unique keys',async()=>{
    await Promise.all(Array.from({length:30},(_,i)=>rpc('upsert',{p_key:'owner',p_fields:JSON.stringify({traits:{index:i}})})));
    await rpc('upsert',{p_key:'owner',p_fields:JSON.stringify({riasec:'RIA'})});
    assert.equal((await row('owner')).traits.index,29);
    assert.equal((await db.query("SELECT count(*)::int n FROM conversations WHERE user_id='owner'")).rows[0].n,1);
  });
  await check('multiple client buckets share one rate-limit ceiling and expire',async()=>{
    const results=await Promise.all(Array.from({length:100},()=>rpc('rate_limit',{p_key:'same',p_limit:20,p_window_ms:60000})));
    assert.equal(results.filter(Boolean).length,20);
    await db.exec("UPDATE rico_limits SET expires_at=now()-interval '1 second' WHERE key='same'");
    assert.equal(await rpc('rate_limit',{p_key:'same',p_limit:20,p_window_ms:60000}),true);
  });
  await check('AI gate rejects capacity and daily overages; zero disables paid requests',async()=>{
    const first=randomUUID(), second=randomUUID();
    assert.equal(await rpc('provider_admit',{p_token:first,p_daily_limit:2,p_concurrency:1}),true);
    assert.equal(await rpc('provider_admit',{p_token:second,p_daily_limit:2,p_concurrency:1}),false);
    await rpc('release_lease',{p_key:'provider:'+first,p_token:first});
    assert.equal(await rpc('provider_admit',{p_token:second,p_daily_limit:2,p_concurrency:1}),true);
    await rpc('release_lease',{p_key:'provider:'+second,p_token:second});
    assert.equal(await rpc('provider_admit',{p_token:randomUUID(),p_daily_limit:2,p_concurrency:1}),false);
    assert.equal(await rpc('provider_admit',{p_token:randomUUID(),p_daily_limit:0,p_concurrency:1}),false);
  });
  await check('stale conversation branches are rejected; successful retry is idempotent',async()=>{
    const save=messages=>rpc('save_conversation',{p_key:'chat',p_fields:JSON.stringify({messages,traits:{O:20},msg_count:1})});
    const original=[{role:'user',content:'Hi'},{role:'assistant',content:'Hello'}];
    await rpc('upsert',{p_key:'chat',p_fields:JSON.stringify({traits:{resume:'keep me'}})});
    assert.equal(await save(original),true);
    assert.equal(await save([...original,{role:'user',content:'From tab one'}]),true);
    assert.equal(await save([...original,{role:'user',content:'From tab two'}]),false);
    assert.equal(await save(original),true);
    assert.equal((await row('chat')).messages.length,3);
    assert.equal((await row('chat')).traits.resume,'keep me');
  });
  await check('lease fencing rejects expired owners and protects replacements',async()=>{
    const old=randomUUID(), fresh=randomUUID(), key='club:club::test::feed';
    assert.equal(await rpc('lease',{p_key:key,p_token:old,p_seconds:10}),true);
    assert.equal(await rpc('lease',{p_key:key,p_token:fresh,p_seconds:10}),false);
    await db.query("UPDATE rico_leases SET expires_at=now()-interval '1 second' WHERE key=$1",[key]);
    assert.equal(await rpc('lease',{p_key:key,p_token:fresh,p_seconds:10}),true);
    await rpc('release_lease',{p_key:key,p_token:old});
    await assert.rejects(rpc('club_mutate',{p_key:'club::test::feed',p_mutation:JSON.stringify({action:'append',items:[{id:'a'}]}),p_lease:old}),/expired/);
    await rpc('club_mutate',{p_key:'club::test::feed',p_mutation:JSON.stringify({action:'append',items:[{id:'a'}]}),p_lease:fresh});
  });
  await check('club append and reaction updates preserve other writers',async()=>{
    await Promise.all(Array.from({length:25},(_,i)=>rpc('club_mutate',{p_key:'club::test::feed',p_mutation:JSON.stringify({action:'append',items:[{id:'post-'+i}]}),p_lease:null})));
    await Promise.all(Array.from({length:20},(_,i)=>rpc('club_mutate',{p_key:'club::test::feed',p_mutation:JSON.stringify({action:'react',itemId:'a',emoji:'heart',reactorId:'user'+i}),p_lease:null})));
    const stored=await row('club::test::feed');
    assert.equal(stored.messages.length,26);
    assert.equal(stored.messages[0].reactions.heart.length,20);
  });
  await check('social counters handle likes, retries, unlike, comments and deletion',async()=>{
    const set=(key,traits)=>rpc('upsert',{p_key:key,p_fields:JSON.stringify({traits})});
    const like={kind:'social-like',postId:'post1',authorId:'alice',active:true};
    await set('alice::social::like::post1',like); await set('alice::social::like::post1',like);
    await set('bob::social::like::post1',{...like,authorId:'bob'});
    await set('comment1',{kind:'social-comment',postId:'post1'});
    let a=await rpc('social_activity',{p_ids:['post1'],p_user:'alice'});
    assert.deepEqual(a.post1,{likes:2,comments:1,liked:true,saved:false});
    await set('alice::social::like::post1',{...like,active:false});
    await db.exec("DELETE FROM conversations WHERE user_id='comment1'");
    a=await rpc('social_activity',{p_ids:['post1'],p_user:'alice'});
    assert.deepEqual(a.post1,{likes:1,comments:0,liked:false,saved:false});
  });
  await check('insert-once never replaces a concurrent author retry',async()=>{
    await rpc('insert_once',{p_key:'post:retry',p_traits:JSON.stringify({kind:'social-post',id:'retry',content:'original'})});
    const retry=await rpc('insert_once',{p_key:'post:retry',p_traits:JSON.stringify({kind:'social-post',id:'retry',content:'overwrite'})});
    assert.equal(retry.content,'original');
  });
  await check('cursor pages exclude photos and remain stable across intervening inserts',async()=>{
    await db.exec("DELETE FROM conversations WHERE traits->>'kind'='social-post'");
    for(let i=0;i<30;i++) await rpc('insert_once',{p_key:'post:'+String(i).padStart(3,'0'),p_traits:JSON.stringify({kind:'social-post',id:'p'+i,image:'data:huge',ai:false,content:'Test'})});
    const args={p_user:'alice',p_filter:'all',p_author:null,p_before:null,p_key:null};
    const first=await rpc('social_page',args), last=first[11];
    assert.equal(first.length,13); assert.equal(first[0].traits.image,undefined); assert.equal(first[0].traits.hasImage,true);
    await rpc('insert_once',{p_key:'post:new',p_traits:JSON.stringify({kind:'social-post',id:'new'})});
    const second=await rpc('social_page',{...args,p_before:last.updated_at,p_key:last.user_id});
    assert.equal(second.length,13);assert.ok(second.every(r=>!first.slice(0,12).some(a=>a.user_id===r.user_id)));
  });
  await check('daily publishing is fenced and idempotent',async()=>{
    const token=randomUUID(), key='daily:test';
    await rpc('lease',{p_key:key,p_token:token,p_seconds:60});
    const args={p_posts:JSON.stringify([{id:'daily-test',content:'First'}]),p_key:key,p_lease:token};
    await rpc('publish_daily',args);await rpc('publish_daily',args);
    assert.equal((await row('social-ai::social::post::daily-test')).traits.ai,true);
    await rpc('release_lease',{p_key:key,p_token:token});
    await assert.rejects(rpc('publish_daily',args),/expired/);
  });
  const count=Number(process.env.SCALE_FIXTURE_ROWS || 10000);
  assert.ok(count>=1000 && count<=1000000);
  await check(`${count.toLocaleString()} reaction rows keep exact bounded counters`,async()=>{
    for (let start=1;start<=count;start+=10000) {
      const end=Math.min(count,start+9999);
      await db.exec(`INSERT INTO conversations(user_id,traits) SELECT 'fixture:' || i, jsonb_build_object('kind','social-like','postId','popular','active',true) FROM generate_series(${start},${end}) i;`);
      // Keep fixture transactions bounded and reclaim old counter versions.
      await db.exec('VACUUM rico_social_counts');
      if(end%100000===0)console.log('FIXTURE_ROWS '+end);
    }
    await db.exec('ANALYZE conversations; ANALYZE rico_social_counts;');
    const result=await rpc('social_activity',{p_ids:['popular'],p_user:'alice'});
    assert.equal(result.popular.likes,count);
    const shards=(await db.query("SELECT count(*)::int n FROM rico_social_counts WHERE post_id='popular'")).rows[0].n;
    assert.ok(shards<=32);
    const plan=await db.query("EXPLAIN (FORMAT JSON) SELECT sum(likes) FROM rico_social_counts WHERE post_id='popular'");
    console.log('COUNTER_SHARDS '+shards+'; PostgreSQL aggregate plan verified on local fixtures');
    assert.ok(plan.rows.length);
  });
  await check('migration rerun backfills without duplicating counts',async()=>{
    await db.exec(migration);
    assert.equal((await rpc('social_activity',{p_ids:['popular'],p_user:'alice'})).popular.likes,count);
  });
  await check('anonymous and signed-in browser roles cannot call privileged RPCs',async()=>{
    for(const role of ['anon','authenticated']) {
      await db.exec('SET ROLE '+role);
      await assert.rejects(db.query("SELECT public.rico_rate_limit('unauthorized',20,60000)"),/permission denied/);
      await assert.rejects(db.query('SELECT * FROM rico_social_counts'),/permission denied/);
      await db.exec('RESET ROLE');
    }
  });
  await db.close();
  const duplicate=new PGlite(); await duplicate.exec(schema+"INSERT INTO conversations(user_id) VALUES('same'),('same');");
  await check('preflight aborts duplicate keys without deleting customer rows',async()=>{
    await assert.rejects(duplicate.exec(migration),/duplicate\/null/);
    await duplicate.exec('ROLLBACK');
    assert.equal((await duplicate.query('SELECT count(*)::int n FROM conversations')).rows[0].n,2);
  });
  await duplicate.close();
  console.log(JSON.stringify({passed,fixtureRows:count,networkRequests:0,productionRequests:0,modelCalls:0,note:'Embedded PostgreSQL serializes execution; this does not measure production concurrency or capacity.'}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
