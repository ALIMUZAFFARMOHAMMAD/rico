const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
function load(file, bindings, names=['handler']) {
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export default /g,'').replace(/export /g,'');
  const context={module:{exports:{}},console:{error(){},log(){}},AbortSignal,randomUUID,process:{env:{ANTHROPIC_API_KEY:'test'}},rateLimited:()=>false,configured:()=>true,ownsUser:(_,id)=>id==='owner',...bindings};
  vm.runInNewContext(source+'\nmodule.exports={'+names.join(',')+'};',context);return context.module.exports;
}
function response(){return{code:200,status(code){this.code=code;return this;},json(data){this.body=data;return this;},end(){return this;}};}
test('busy social activity does not consume voice or translator rate limits',()=>{
  const {rateLimited}=load('lib/ratelimit.js',{},['rateLimited']);
  const req=url=>({url,headers:{'x-forwarded-for':'127.0.0.1'}});
  for(let i=0;i<20;i++)assert.equal(rateLimited(req('/api/social?filter=all')),false);
  assert.equal(rateLimited(req('/api/social?filter=ai')),true);assert.equal(rateLimited(req('/api/voice')),false);assert.equal(rateLimited(req('/api/translate')),false);
});
test('saved notebook notes load and delete without an AI provider key',async()=>{
  let saved;const handler=load('pages/api/notebook.js',{process:{env:{}},notebookKey:id=>id,getRow:async()=>({traits:{notes:[{id:'n1',text:'My note'}]}}),upsertRow:async(_,d)=>saved=d}).handler;
  const read=response();await handler({method:'POST',body:{userId:'owner',mode:'get'}},read);assert.equal(read.code,200);assert.equal(read.body.notes[0].text,'My note');
  const del=response();await handler({method:'POST',body:{userId:'owner',mode:'delete',id:'n1'}},del);assert.equal(del.code,200);assert.equal(saved.traits.notes.length,0);
  const ai=response();await handler({method:'POST',body:{userId:'owner',mode:'ask',question:'Hello'}},ai);assert.equal(ai.code,503);
});
test('classroom course lists remain available without AI credits or provider config',async()=>{
  const handler=load('pages/api/tutor.js',{process:{env:{}},LANGS:{en:{}},AGENTS:{},getUserRows:async()=>[]}).handler;
  const res=response();await handler({method:'POST',body:{userId:'owner',mode:'list'}},res);assert.equal(res.code,200);assert.equal(res.body.courses.length,0);
  const forbidden=response();await handler({method:'POST',body:{mode:'list'}},forbidden);assert.equal(forbidden.code,403);
});
test('classroom cannot claim to save a course when the database is unavailable',async()=>{
  const handler=load('pages/api/tutor.js',{configured:()=>false}).handler;const res=response();await handler({method:'POST',body:{userId:'owner',mode:'course_create'}},res);assert.equal(res.code,503);
});
test('translation validates types, limits and language codes before provider work',async()=>{
  const handler=load('pages/api/translate.js',{LANGS:{en:{name:'English'},fr:{name:'French'}},fetch:async()=>{throw Error('Provider should not be called');}}).handler;
  for(const body of [{text:{}},{text:'x'.repeat(1501)},{text:'Hello',from:'en',to:'inject'}]){const res=response();await handler({method:'POST',body},res);assert.equal(res.code,400);}
  const res=response();await handler({method:'POST',body:{text:'Hello',from:'en',to:'en'}},res);assert.equal(res.code,200);assert.equal(res.body.text,'Hello');
});
test('translation has an upstream deadline and rejects empty structured results',async()=>{
  let signal;const handler=load('pages/api/translate.js',{LANGS:{en:{name:'English'},fr:{name:'French'}},fetch:async(_,opts)=>{signal=opts.signal;return{ok:true,json:async()=>({content:[{text:'{"lang":"en"}'}]})};}}).handler;
  const res=response();await handler({method:'POST',body:{text:'Hello',from:'auto',to:'fr'}},res);assert.equal(res.code,500);assert.ok(signal instanceof AbortSignal);
});
test('club writes require the session owner and validate the parent and reaction',async()=>{
  let writes=0;const handler=load('pages/api/club-feed.js',{CLUBS:[{id:'club',agents:['tony']}],AGENTS:{tony:{id:'tony'}},AGENT_LIST:[],LANGS:{en:{}},getRow:async()=>({messages:[]}),upsertRow:async()=>writes++}).handler;
  for(const[body,code]of[[{userId:'other',action:'comment'},403],[{userId:'owner',action:'comment',text:'Hi',parentId:'missing'},404],[{userId:'owner',action:'react',itemId:'missing',emoji:'💜'},404],[{userId:'owner',action:'react',itemId:'missing',emoji:'invalid'},400]]){const res=response();await handler({method:'POST',body:{clubId:'club',...body}},res);assert.equal(res.code,code);}assert.equal(writes,0);
});
test('reports require an owner and accept human club content for review',async()=>{
  let writes=0;const handler=load('pages/api/report.js',{AGENTS:{},CLUBS:[{id:'club'}],metaKey:id=>id,getRow:async()=>null,upsertRow:async()=>writes++}).handler;
  for(const[userId,code]of[[null,403],['other',403],['owner',200]]){const res=response();await handler({method:'POST',body:{userId,agentId:'club',reason:'uncomfortable',message:'Reported content'}},res);assert.equal(res.code,code);}assert.equal(writes,1);
});
