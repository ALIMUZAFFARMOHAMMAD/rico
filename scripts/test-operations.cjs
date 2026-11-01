const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function source(file){return fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');}
test('disabled AI cannot reach providers even without shared storage',async()=>{
 let calls=0;
 const context={process:{env:{AI_GENERATION_DISABLED:'true'}},URL,scaleEnabled:()=>false,fetch:async()=>{calls++;return new Response('ok');},Response};
 const fetcher=vm.runInNewContext(source('lib/provider-fetch.js')+';providerFetch',context);
 await assert.rejects(fetcher('https://api.openai.com/v1/responses',{method:'POST'}),/disabled/);
 assert.equal(calls,0);
 await fetcher('https://api.elevenlabs.io/v1/voices/fixture',{method:'DELETE'});
 assert.equal(calls,1);
});
test('operational events contain no identities, URLs or response data',()=>{
 const lines=[];const record=vm.runInNewContext(source('lib/operational-metrics.js')+';recordOperation',{Date,Math,console:{info:s=>lines.push(JSON.parse(s))}});
 record('database',Date.now()-1200,503,true);
 record('sensitive-user-id',Date.now(),200,true);
 assert.equal(lines.length,1);assert.deepEqual(Object.keys(lines[0]).sort(),['durationMs','event','failed','service','status']);
 assert.equal(lines[0].failed,true);
});
test('database failures do not expose upstream error bodies',async()=>{
 const events=[];const context={process:{env:{NEXT_PUBLIC_SUPABASE_URL:'http://local.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'}},AbortSignal,Date,recordOperation:(...a)=>events.push(a),fetch:async()=>new Response('private customer value',{status:503})};
 const sb=vm.runInNewContext(source('lib/db.js')+';sb',{...context,databaseGate:fn=>fn()});
 await assert.rejects(sb('/conversations'),error=>error.message==='Database request failed (503)');
 assert.equal(events.length,1);assert.equal(events[0][3],true);
});

test('account cleanup paginates past 1,000 rows and preserves LIKE-overmatched owners',async()=>{
 let rows=Array.from({length:1305},(_,i)=>({id:'00000000-0000-0000-0000-'+String(i+1).padStart(12,'0'),user_id:(i%261===0?'userXowner':'user_owner')+'::social::post::'+i}));
 const sb=async(url,method)=>{
   if(method==='DELETE'){const ids=url.match(/in\.\((.*)\)/)[1].split(',');rows=rows.filter(r=>!ids.includes(r.id));return;}
   if(!url.includes('user_id=like.'))return [];
   const cursor=url.match(/id=gt\.([^&]+)/)?.[1]||'';
   return rows.filter(r=>r.id>cursor).slice(0,100);
 };
 const code=fs.readFileSync(path.join(__dirname,'../pages/api/account.js'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export default /g,'').replace(/export /g,'');
 const remove=vm.runInNewContext(code+';deleteOwnedRows',{sb,twinKey:id=>'twin::'+id});
 assert.equal(await remove('user_owner'),1300);assert.equal(rows.length,5);assert.ok(rows.every(r=>r.user_id.startsWith('userXowner')));
});
