const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load(file, bindings = {}, names = ['handler']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '');
  const context = { module: { exports: {} }, console: { error() {} }, Buffer, FormData, Blob, Date, ...bindings };
  vm.runInNewContext(source + '\nmodule.exports = {' + names.join(',') + '};', context);
  return context.module.exports;
}
const view = load('lib/conversation-view.js', {}, ['messageText','visibleMessages','validConversation']);
function response() { return { code: 200, headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, end() { return this; } }; }
const body = { userId: 'user_owner', agent: 'tony', messages: [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello!' }], traits: { O: 50 }, riasec: '', msgCount: 2 };
function conversation(overrides = {}) { return load('pages/api/conversation.js', { ...view, configured: () => true, ownsUser: (_req,id) => id === 'user_owner', memKey: (id,agent) => agent === 'tony' || !agent ? id : `${id}::agent::${agent}`, parseKey: key => { const [userId,kind,agentId] = key.split('::'); return { userId, kind:kind || 'tony', agentId:agentId || (kind ? null : 'tony') }; }, getUserRows: async () => [], getRow: async () => null, upsertRow: async () => {}, ...overrides }).handler; }
test('history restores visible exchanges and removes model-only markers', () => {
  const result = view.visibleMessages([{ role:'user',content:'[START]' }, { role:'assistant',content:'Hello {"O":55,"C":30}' }, { role:'user',content:'My day was good' }]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)).map(message => message.text), ['Hello','My day was good']);
});
test('conversation rejects malformed and injected trait data', () => {
  assert.equal(view.validConversation(body),true);
  for (const invalid of [{...body,messages:[{role:'system',content:'bad'}]}, {...body,msgCount:-1}, {...body,traits:{resume:{text:'overwrite'}}}, {...body,messages:[{role:'user',content:42}]}]) assert.equal(view.validConversation(invalid),false);
});
test('conversation ownership is checked before database reads', async () => {
  let reads = 0; const handler = conversation({ getRow: async () => { reads++; } }); const res = response();
  await handler({method:'GET',query:{userId:'user_someone_else'}},res);
  assert.equal(res.code,403); assert.equal(reads,0);
});
test('database outage is an error, never an empty successful conversation', async () => {
  const handler = conversation({getRow: async () => { throw new Error('database unavailable'); }}); const res = response();
  await handler({method:'GET',query:{userId:'user_owner'}},res);
  assert.equal(res.code,503); assert.ok(res.body.error); assert.equal(res.headers['Cache-Control'],'private, no-store');
});
test('saving chat preserves existing non-chat profile fields', async () => {
  let saved; const handler = conversation({getRow:async()=>({traits:{resume:{summary:'Existing CV'},O:10}}), upsertRow:async(key,value)=>{saved=value;}}); const res=response();
  await handler({method:'POST',body},res); assert.equal(res.code,200); assert.equal(saved.traits.resume.summary,'Existing CV'); assert.equal(saved.traits.O,50);
});
test('inbox summaries select newest duplicate and exclude metadata and other owners',async()=>{
  const handler=conversation({getUserRows:async()=>[
    {user_id:'user_owner',messages:[{content:'Old'}],updated_at:'2026-01-01'},
    {user_id:'user_owner',messages:[{content:'New'}],updated_at:'2026-02-01'},
    {user_id:'user_owner::meta',messages:['tony']},
    {user_id:'userXowner::agent::tony',messages:[{content:'Private'}]}
  ]}); const res=response(); await handler({method:'GET',query:{userId:'user_owner',summary:'1'}},res);
  assert.equal(res.body.conversations.length,1); assert.equal(res.body.conversations[0].preview,'New');
});
function voice(overrides={}) { return load('pages/api/twin-voice.js', {configured:()=>true,rateLimited:()=>false,ownsUser:(_req,id)=>id==='user_owner',process:{env:{}},twinKey:id=>'twin::'+id,twinVoice:()=> 'stock',selfVoiceOn:()=>true,selfVoiceId:id=>id,randomUUID:()=> 'unique-new-id-1234',getRow:async()=>({traits:{persona:'My twin',voice:'self:old',voiceCloned:true}}),upsertRow:async()=>{},selfVoice:async()=>({ok:true}),removeTwinVoice:async()=>{},...overrides}).handler; }
const voiceBody={userId:'user_owner',audio:Buffer.alloc(25000).toString('base64'),consent:true};
test('failed clone leaves old voice untouched',async()=>{
  const removed=[];const handler=voice({selfVoice:async()=>({ok:false,status:502,text:async()=> 'busy'}),removeTwinVoice:async(id)=>removed.push(id)}); const res=response();
  await handler({method:'POST',body:voiceBody},res); assert.equal(res.code,502);assert.deepEqual(removed,[]);
});
test('replacement is saved before the previous clone is removed',async()=>{
  const order=[];const handler=voice({upsertRow:async()=>order.push('saved'),removeTwinVoice:async(id)=>order.push(id)});const res=response();
  await handler({method:'POST',body:voiceBody},res);assert.equal(res.code,200);assert.deepEqual(order,['saved','self:old']);
});
test('database failure cleans up new clone and preserves the previous clone',async()=>{
  const removed=[];const handler=voice({upsertRow:async()=>{throw new Error('offline');},removeTwinVoice:async(id)=>removed.push(id)});const res=response();
  await handler({method:'POST',body:voiceBody},res);assert.equal(res.code,500);assert.equal(removed.length,1);assert.notEqual(removed[0],'self:old');
});
test('failed voice deletion is not reported as successful',async()=>{
  let saved=false;const handler=voice({removeTwinVoice:async()=>{throw new Error('offline');},upsertRow:async()=>{saved=true;}});const res=response();
  await handler({method:'DELETE',body:{userId:'user_owner'}},res);assert.equal(res.code,503);assert.equal(saved,false);
});
test('voice cloning requires explicit boolean consent and account ownership',async()=>{
  for(const [data,code] of [[{...voiceBody,consent:'yes'},400],[{...voiceBody,userId:'someone-else'},403]]) {const res=response();await voice()({method:'POST',body:data},res);assert.equal(res.code,code);}
});
