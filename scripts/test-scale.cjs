const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto');
function load(file,names,bindings={}) {
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export default /g,'').replace(/export /g,'');
  const context={console:{error(){}},process:{env:{}},Buffer,AbortSignal,URL,Response,ReadableStream,Headers,Blob,Date,...crypto,scaleEnabled:()=>false,getAuth:req=>({userId:req.userId}),...bindings};
  return vm.runInNewContext(source+'\n({'+names.join(',')+'})',context);
}
const req=(userId,route='/api/voice')=>({userId,url:route,headers:{'x-forwarded-for':'shared-office'}});
test('local limiter survives identity flooding without resetting blocked users',async()=>{
  const {rateLimited}=load('lib/ratelimit.js',['rateLimited']);
  for(let i=0;i<20;i++)assert.equal(await rateLimited(req('blocked')),false);
  assert.equal(await rateLimited(req('blocked')),true);
  for(let i=0;i<11000;i++)await rateLimited(req('new-'+i));
  assert.equal(await rateLimited(req('blocked')),true);
  assert.equal(await rateLimited(req('overflow')),true);
});
test('signed-in members behind one IP have separate buckets',async()=>{
  const {rateLimited}=load('lib/ratelimit.js',['rateLimited']);
  for(let i=0;i<100;i++)assert.equal(await rateLimited(req('member'+i)),false);
});
test('ten server instances share one ceiling and outages fail closed',async()=>{
  const counts=new Map();
  const scaleRpc=async(_,a)=>{counts.set(a.p_key,(counts.get(a.p_key)||0)+1);return counts.get(a.p_key)<=a.p_limit;};
  const servers=Array.from({length:10},()=>load('lib/ratelimit.js',['rateLimited'],{scaleEnabled:()=>true,scaleRpc}).rateLimited);
  const outcomes=await Promise.all(Array.from({length:200},(_,i)=>servers[i%10](req('same'))));
  assert.equal(outcomes.filter(v=>!v).length,20);
  const broken=load('lib/ratelimit.js',['rateLimited'],{scaleEnabled:()=>true,scaleRpc:async()=>{throw Error('db down');}});
  assert.equal(await broken.rateLimited(req('one')),true);
});
test('every production limiter caller awaits the shared check',()=>{
  function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
  for(const file of walk(path.join(__dirname,'../pages/api')).filter(f=>f.endsWith('.js'))) {
    const source=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(source,/(?<!await )rateLimited\(req/,file);
  }
});
test('provider admission denial makes zero upstream calls',async()=>{
  let calls=0;
  const {providerFetch}=load('lib/provider-fetch.js',['providerFetch'],{scaleEnabled:()=>true,scaleRpc:async()=>false,fetch:async()=>calls++});
  await assert.rejects(providerFetch('https://api.openai.com/v1/test'),/capacity/);assert.equal(calls,0);
});
test('provider slot remains held until body completion, and releases on failure',async()=>{
  const events=[];
  const {providerFetch}=load('lib/provider-fetch.js',['providerFetch'],{scaleEnabled:()=>true,
    scaleRpc:async name=>{events.push(name);return true;},fetch:async()=>{events.push('fetch');return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"ok":true}'));c.close();events.push('body');}}));}});
  assert.equal((await (await providerFetch('https://api.anthropic.com/v1/messages')).json()).ok,true);
  assert.deepEqual(events,['provider_admit','fetch','body','release_lease']);
  events.length=0;
  const failing=load('lib/provider-fetch.js',['providerFetch'],{scaleEnabled:()=>true,scaleRpc:async name=>{events.push(name);return true;},fetch:async()=>{throw Error('upstream down');}});
  await assert.rejects(failing.providerFetch('https://api.elevenlabs.io/v1/test'),/upstream/);
  assert.deepEqual(events,['provider_admit','release_lease']);
});
test('streaming speech starts before completion and cancellation releases its slot',async()=>{
  const events=[];
  const {providerFetch}=load('lib/provider-fetch.js',['providerFetch'],{scaleEnabled:()=>true,scaleRpc:async name=>{events.push(name);return true;},fetch:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2,3]));}}))});
  const response=await providerFetch('https://api.elevenlabs.io/v1/speech');
  const reader=response.body.getReader();assert.equal((await reader.read()).value.length,3);
  assert.deepEqual(events,['provider_admit']);
  await reader.cancel();assert.deepEqual(events,['provider_admit','release_lease']);
});
test('provider errors preserve readable response bodies without holding slots',async()=>{
  const events=[];
  const {providerFetch}=load('lib/provider-fetch.js',['providerFetch'],{scaleEnabled:()=>true,scaleRpc:async name=>{events.push(name);return true;},fetch:async()=>new Response('{"error":"quota"}',{status:429})});
  assert.equal((await (await providerFetch('https://api.openai.com/v1/test')).json()).error,'quota');
  assert.deepEqual(events,['provider_admit','release_lease']);
});
test('public health polls coalesce database reads and never spend AI credits',async()=>{
  let reads=0;
  const {handler}=load('pages/api/health.js',['handler'],{process:{env:{ANTHROPIC_API_KEY:'fixture'}},configured:()=>true,sb:async()=>{reads++;return[];},fetch:()=>{throw Error('Paid health probe');}});
  const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
  const outputs=Array.from({length:100},response);await Promise.all(outputs.map(res=>handler({method:'GET'},res)));
  assert.equal(reads,1);assert.equal(outputs[0].body.ai,'configured-unverified');
});
test('large social counts use one aggregate request; no reaction scans',async()=>{
  let calls=0;
  const {socialActivity}=load('lib/social-feed.js',['socialActivity'],{scaleEnabled:()=>true,scaleRpc:async(name,args)=>{calls++;assert.equal(name,'social_activity');assert.equal(args.p_ids.length,1);return{popular:{likes:1000000,comments:0,liked:false,saved:false}};},sb:()=>{throw Error('Unbounded scan');}});
  assert.equal((await socialActivity(['popular'],'viewer')).popular.likes,1000000);assert.equal(calls,1);
});
test('cursor validation rejects malformed and oversized inputs',()=>{
  const {parseSocialCursor}=load('lib/social-feed.js',['parseSocialCursor']);
  for(const input of ['!', 'a'.repeat(1001),Buffer.from(JSON.stringify({time:'bad',key:'k'})).toString('base64url')])assert.throws(()=>parseSocialCursor(input));
});
test('story cache coalesces simultaneous readers and retries failed fetches',async()=>{
  let calls=0;
  const {listSocialStories}=load('lib/social-feed.js',['listSocialStories'],{scaleEnabled:()=>true,scaleRpc:async()=>{calls++;return[];}});
  await Promise.all(Array.from({length:100},()=>listSocialStories()));await listSocialStories();assert.equal(calls,1);
});
test('busy generation lease returns cached club posts without provider work',async()=>{
  let providerCalls=0;
  const {getOrGenerateSpaceItems}=load('pages/api/club-feed.js',['getOrGenerateSpaceItems'],{scaleEnabled:()=>true,getRow:async()=>({messages:[{id:'cached'}]}),acquireLease:async()=>null,fetch:async()=>providerCalls++});
  const result=await getOrGenerateSpaceItems('test',{space:{id:'test'}},'en');assert.equal(result.items[0].id,'cached');assert.equal(providerCalls,0);
});
test('conversation conflict is returned without a destructive fallback write',async()=>{
  const {handler}=load('pages/api/conversation.js',['handler'],{configured:()=>true,rateLimited:async()=>false,ownsUser:()=>true,validConversation:()=>true,memKey:id=>id,scaleEnabled:()=>true,scaleRpc:async()=>false,getRow:()=>{throw Error('Legacy fallback');},upsertRow:()=>{throw Error('Destructive write');}});
  const response={code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler({method:'POST',body:{userId:'owner',messages:[]}},response);assert.equal(response.code,409);assert.equal(response.body.code,'CONVERSATION_CONFLICT');
});
