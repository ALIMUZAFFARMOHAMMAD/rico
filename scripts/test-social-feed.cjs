const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
function load(file, bindings, names) {
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export default /g,'').replace(/export /g,'');
  const context={module:{exports:{}},console:{error(){}},Buffer,AbortController,setTimeout,clearTimeout,createHash,...bindings};
  vm.runInNewContext(source+'\nmodule.exports={'+names.join(',')+'};',context); return context.module.exports;
}
const names=['validSocialId','socialKey','publicPost','findSocialPost','saveSocialPost','listSocialPosts','listSocialComments','socialActivity','deleteSocialPost'];
const helpers=load('lib/social-feed.js',{},names);
const imageHelpers=load('lib/portrait-image.js',{},['portraitBytes']);
const image='data:image/jpeg;base64,'+Buffer.from([255,216,255,224,0,10,74,70,73,70,0,0,0,0,255,217]).toString('base64');
function response(){return{code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.body=data;return this;},end(){return this;},send(data){this.body=data;return this;}};}
function api(overrides={}) {return load('pages/api/social.js',{...helpers,...imageHelpers,configured:()=>true,ownsUser:(_,id)=>id==='owner',rateLimited:()=>false,getRow:async()=>null,upsertRow:async()=>{},findSocialPost:async()=>({user_id:'owner::social::post::post1',traits:{id:'post1',authorId:'owner',ai:false}}),saveSocialPost:async(_,p)=>p,socialActivity:async ids=>Object.fromEntries(ids.map(id=>[id,{likes:0,comments:0,liked:false}])),...overrides},['handler']).handler;}
const post={action:'post',id:'client-id',userId:'owner',userName:'A member',content:'Hello today'};
test('signed-out and forged ownership requests cannot read or mutate Social',async()=>{
  for(const method of ['GET','POST']) {const res=response();await api()({method,query:{userId:'other'},body:{...post,userId:'other'}},res);assert.equal(res.code,403);}
});
test('member posts bind author and AI status on server and scope IDs to owner',async()=>{
  let saved;const res=response();await api({saveSocialPost:async(owner,p)=>{saved={owner,p};return p;}})({method:'POST',body:{...post,ai:true,authorId:'someone',image}},res);
  assert.equal(res.code,200);assert.equal(saved.owner,'owner');assert.equal(saved.p.ai,false);assert.equal(saved.p.authorId,'owner');assert.equal(saved.p.image,image);assert.equal(saved.p.id,createHash('sha256').update('owner:client-id').digest('hex'));
});
test('malformed images, blank posts and oversized captions are rejected without writes',async()=>{
  for(const invalid of [{content:''},{content:'x'.repeat(2001)},{image:'https://external.test/a.jpg'},{id:'bad,query'}]){let writes=0;const res=response();await api({saveSocialPost:async()=>writes++})({method:'POST',body:{...post,...invalid}},res);assert.equal(res.code,400);assert.equal(writes,0);}
});
test('feed reads never require an AI provider and reject invalid paging',async()=>{
  let calls=0;const handler=api({listSocialPosts:async()=>{calls++;return{posts:[],nextOffset:null};}});
  for(const[offset,code]of[['0',200],['-1',400],['1.5',400]]){const res=response();await handler({method:'GET',query:{userId:'owner',offset}},res);assert.equal(res.code,code);}assert.equal(calls,1);
});
test('reactions use explicit desired state and separate per-member records',async()=>{
  const writes=[];const handler=api({upsertRow:async(key,data)=>writes.push({key,data})});
  for(const liked of [true,true,false]){const res=response();await handler({method:'POST',body:{userId:'owner',action:'like',postId:'post1',liked}},res);assert.equal(res.code,200);}
  assert.equal(writes[0].key,'owner::social::like::post1');assert.equal(writes[1].data.traits.active,true);assert.equal(writes[2].data.traits.active,false);assert.equal(writes[0].data.messages,undefined);
});
test('comments are saved once on retries and nonexistent parents are rejected',async()=>{
  let stored,writes=0;const handler=api({getRow:async()=>stored,upsertRow:async(_,data)=>{stored=data;writes++;}});
  for(let i=0;i<2;i++){const res=response();await handler({method:'POST',body:{userId:'owner',action:'comment',postId:'post1',id:'reply1',content:'Hello'}},res);assert.equal(res.code,200);}assert.equal(writes,1);
  const res=response();await api({findSocialPost:async()=>null})({method:'POST',body:{userId:'owner',action:'like',postId:'missing',liked:true}},res);assert.equal(res.code,404);
});
test('only a member post owner can delete it; database failures never report success',async()=>{
  for(const traits of [{authorId:'other',ai:false},{authorId:'owner',ai:true}]){const res=response();await api({findSocialPost:async()=>({traits})})({method:'POST',body:{userId:'owner',action:'delete',postId:'post1'}},res);assert.equal(res.code,403);}
  const res=response();await api({saveSocialPost:async()=>{throw Error('private database detail');}})({method:'POST',body:post},res);assert.equal(res.code,503);assert.doesNotMatch(res.body.error,/private database/);
});
test('storage retries preserve original content and do not overwrite other posts',async()=>{
  const records=new Map();const store=load('lib/social-feed.js',{getRow:async key=>records.get(key),upsertRow:async(key,data)=>records.set(key,data)},names);
  await Promise.all([store.saveSocialPost('one',{id:'a',content:'A'}),store.saveSocialPost('two',{id:'b',content:'B'})]);
  await store.saveSocialPost('one',{id:'a',content:'Changed'});assert.equal(records.size,2);assert.equal(records.get('one::social::post::a').traits.content,'A');
});
test('activity aggregates member reactions without returning reactor identities or private messages',async()=>{
  let query;const store=load('lib/social-feed.js',{sb:async q=>{query=q;return[{user_id:'a',postId:'post1',kind:'social-like',active:true,authorId:'owner'},{user_id:'a',postId:'post1',kind:'social-like',active:true,authorId:'owner'},{user_id:'b',postId:'post1',kind:'social-like',active:false,authorId:'other'},{user_id:'c',postId:'post1',kind:'social-comment'}];}},names);
  const result=await store.socialActivity(['post1'],'owner');assert.equal(result.post1.likes,1);assert.equal(result.post1.liked,true);assert.equal(result.post1.comments,1);assert.match(query,/traits->>kind=in/);assert.doesNotMatch(query,/select=\*/);
});
test('photo data is served separately and requires sign-in',async()=>{
  assert.equal(helpers.publicPost({id:'post1',image}).image,'/api/social-image?postId=post1');
  for(const[userId,code]of[[null,401],['owner',200]]){const handler=load('pages/api/social-image.js',{...imageHelpers,...helpers,getAuth:()=>({userId}),configured:()=>true,findSocialPost:async()=>({traits:{image}})},['handler']).handler;const res=response();await handler({method:'GET',query:{postId:'post1'}},res);assert.equal(res.code,code);assert.equal(res.headers['Cache-Control'],'private, no-store');}
});
const authors=Array.from({length:4},(_,i)=>({id:'ai'+i,name:'AI '+i,interests:['creativity'],bio:'A creative friend'}));
function daily(overrides={}) {return load('lib/social-daily.js',{AGENT_LIST:authors,...helpers,process:{env:{ANTHROPIC_API_KEY:'test'}},getRow:async()=>null,saveSocialPost:async()=>{},fetch:async()=>({ok:true,json:async()=>({content:[{type:'text',text:JSON.stringify(authors.map(a=>({authorId:a.id,topic:'A small idea',content:'Try a five-minute sketch.'})))}]})}),...overrides},['generateDailySocial']).generateDailySocial;}
test('daily generation creates four clearly labeled posts and same-day retries spend nothing',async()=>{
  const saved=new Map();let calls=0;const run=daily({getRow:async k=>saved.get(k),saveSocialPost:async(owner,p)=>saved.set(helpers.socialKey(owner,'post',p.id),{traits:p}),fetch:async()=>{calls++;return{ok:true,json:async()=>({content:[{type:'text',text:JSON.stringify(authors.map(a=>({authorId:a.id,topic:'One idea',content:'Make something small.'})))}]})};}});
  const now=new Date('2026-10-15T12:00:00Z');assert.equal((await run(now)).created,4);assert.equal((await run(now)).created,0);assert.equal(calls,1);assert.ok([...saved.values()].every(r=>r.traits.ai===true));
});
test('provider failures and incomplete daily batches do not publish invented fallback posts',async()=>{
  for(const result of [{ok:false,status:429},{ok:true,json:async()=>({content:[{type:'text',text:'[]'}]})}]){let writes=0;await assert.rejects(daily({fetch:async()=>result,saveSocialPost:async()=>writes++})(new Date()));assert.equal(writes,0);}
});
test('scheduled daily publishing requires a configured cron secret',async()=>{
  for(const[secret,header,code]of[[undefined,undefined,401],['secret',undefined,401],['secret','Bearer wrong',401],['secret','Bearer secret',200]]){let calls=0;const handler=load('pages/api/cron/keepalive.js',{process:{env:{CRON_SECRET:secret}},configured:()=>true,sb:async()=>[],generateDailySocial:async()=>{calls++;return{created:4};}},['handler']).handler;const res=response();await handler({method:'GET',headers:{authorization:header}},res);assert.equal(res.code,code);assert.equal(calls,code===200?1:0);}
});
