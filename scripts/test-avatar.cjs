const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function load(file, bindings, names) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '');
  const context = { module: { exports: {} }, console: { error() {} }, Buffer, AbortController, setTimeout, clearTimeout, ...bindings };
  vm.runInNewContext(source + '\nmodule.exports = {' + names.join(',') + '};', context);
  return context.module.exports;
}
const palette = load('lib/avatar-look.js', {}, ['cleanLook', 'shade']);
const look = { skin:'#dfb18a', hair:'#28201b', hoodie:'#548dbb', beard:false };
const body = { userId:'owner', action:'preview', image:'data:image/jpeg;base64,/9j/2Q==' };
function response() { return { code:200, setHeader() {}, status(code) { this.code=code; return this; }, json(data) { this.body=data; return this; }, end() {} }; }
function handler(overrides={}) {
  return load('pages/api/avatar.js', { ...palette, process:{env:{ANTHROPIC_API_KEY:'test'}}, ownsUser:(_,id)=>id==='owner', configured:()=>true, rateLimited:()=>false, twinKey:id=>'twin::'+id, getRow:async()=>({traits:{persona:'Existing twin',voice:'self:clone',voiceCloned:true}}), upsertRow:async()=>{}, fetch:async()=>({ok:true,json:async()=>({content:[{type:'text',text:JSON.stringify(look)}]})}), ...overrides }, ['handler']).handler;
}
test('preview returns validated colours without saving a photo or changing the twin',async()=>{
  let writes=0;const res=response();await handler({upsertRow:async()=>writes++})({method:'POST',body},res);
  assert.equal(res.code,200);assert.equal(res.body.applied,false);assert.equal(res.body.look.hair,look.hair);assert.equal(writes,0);
});
test('save preserves persona and cloned voice, clears stale avatar, and only stores palette fields',async()=>{
  let saved; const res=response();await handler({fetch:async()=>{throw Error('must not analyze on save');},upsertRow:async(_,value)=>{saved=value;}})({method:'POST',body:{...body,action:'save',look:{...look,photo:'private',persona:'injected'}}},res);
  assert.equal(res.code,200);assert.equal(res.body.applied,true);assert.equal(saved.traits.voice,'self:clone');assert.equal(saved.traits.persona,'Existing twin');assert.equal(saved.traits.avatar,null);assert.equal(saved.traits.look.photo,undefined);
});
test('missing twin and wrong owner cannot report successful saves',async()=>{
  for (const [overrides,request,code] of [[{getRow:async()=>null},body,409],[{}, {...body,userId:'other'},403]]) {
    let calls=0;const res=response();await handler({...overrides,fetch:async()=>calls++,upsertRow:async()=>calls++})({method:'POST',body:request},res);assert.equal(res.code,code);assert.equal(calls,0);
  }
});
test('database failures cannot be reported as a saved look',async()=>{
  const res=response();await handler({upsertRow:async()=>{throw Error('offline');}})({method:'POST',body:{...body,action:'save',look}},res);assert.equal(res.code,503);assert.equal(res.body.applied,undefined);
});
test('invalid photo, no person, malformed model response, and provider outage are recoverable errors',async()=>{
  for (const [request,fetch,code] of [[{...body,image:'bad'},null,400],[body,async()=>({ok:true,json:async()=>({content:[{type:'text',text:'{"noFace":true}'}]})}),422],[body,async()=>({ok:true,json:async()=>({content:[{type:'text',text:'not JSON'}]})}),502],[body,async()=>({ok:false,status:503}),502]]) {
    let writes=0;const res=response();await handler({...(fetch?{fetch}:{}),upsertRow:async()=>writes++})({method:'POST',body:request},res);assert.equal(res.code,code);assert.ok(res.body.error);assert.equal(writes,0);
  }
});
test('save works without vision credentials; preview explains the outage',async()=>{
  for (const [action,code] of [['save',200],['preview',503]]) {const res=response();await handler({process:{env:{}}})({method:'POST',body:{...body,action,look}},res);assert.equal(res.code,code);}
});
test('invalid palettes including truthy non-boolean facial hair are rejected',()=>{
  assert.equal(palette.cleanLook({...look,beard:'false'}),null);assert.equal(palette.cleanLook({...look,hair:'javascript:x'}),null);assert.equal(palette.cleanLook(look).beard,false);
});
test('refreshing twin preserves its custom appearance and cloned voice',async()=>{
  let saved; const res=response(); const previous={persona:'Previous persona',look,voice:'self:clone',voiceCloned:true,portrait:'saved-photo',avatar:'/api/twin-portrait?id=twin__owner',avatarKind:'ai-portrait'};
  const twin=load('pages/api/twin.js',{configured:()=>true,rateLimited:()=>false,ownsUser:()=>true,getUserRows:async()=>[{user_id:'owner',messages:Array.from({length:12},()=>({role:'user',content:'A substantive conversation message'})),traits:{O:60}}],parseKey:()=>({kind:'tony'}),getRow:async()=>({traits:previous}),twinKey:id=>id,twinLook:()=>({wrong:true}),twinVoice:()=> 'stock',saveTwin:async(_,value)=>{saved=value;},process:{env:{}},fetch:async()=>({json:async()=>({content:[{text:JSON.stringify({name:'Test',persona:'Refreshed persona'})}]})})},['handler']).handler;
  await twin({method:'POST',body:{userId:'owner',userName:'Test'}},res);
  assert.equal(res.code,200);assert.equal(saved.look,look);assert.equal(saved.voice,'self:clone');assert.equal(saved.voiceCloned,true);assert.equal(saved.persona,'Refreshed persona');assert.equal(saved.portrait,'saved-photo');assert.equal(saved.avatarKind,'ai-portrait');assert.equal(res.body.twin.portrait,undefined);
});
