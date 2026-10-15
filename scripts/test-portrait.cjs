const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
function load(file, bindings, names) {
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export default /g,'').replace(/export /g,'');
  const context={module:{exports:{}},console:{error(){}},Buffer,Blob,FormData,AbortController,setTimeout,clearTimeout,createHash,...bindings};
  vm.runInNewContext(source+'\nmodule.exports={'+names.join(',')+'};',context);return context.module.exports;
}
const imageHelpers=load('lib/portrait-image.js',{},['portraitBytes','PORTRAIT_STYLES']);
const bytes=Buffer.from([255,216,255,224,0,10,74,70,73,70,0,0,0,0,255,217]);
const image='data:image/jpeg;base64,'+bytes.toString('base64');
const body={userId:'owner',action:'generate',style:'natural',consent:true,image};
const traits={persona:'Existing twin',voice:'self:clone',voiceCloned:true,look:{skin:'#123456'}};
function response(){return{code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.body=data;return this;},send(data){this.body=data;return this;},end(){return this;}};}
function api(overrides={}){return load('pages/api/portrait.js',{...imageHelpers,process:{env:{OPENAI_API_KEY:'test'}},ownsUser:(_,id)=>id==='owner',configured:()=>true,rateLimited:()=>false,twinKey:id=>'twin::'+id,getRow:async()=>({traits}),upsertRow:async()=>{},fetch:async()=>({ok:true,json:async()=>({data:[{b64_json:bytes.toString('base64')}]})}),...overrides},['handler']).handler;}
test('portrait generation sends a reference image and preserves the saved twin until save',async()=>{
  let request,writes=0;const res=response();await api({fetch:async(url,options)=>{request={url,options};return{ok:true,json:async()=>({data:[{b64_json:bytes.toString('base64')}]})};},upsertRow:async()=>writes++})({method:'POST',body},res);
  assert.equal(res.code,200);assert.equal(res.body.image,image);assert.equal(res.body.applied,false);assert.equal(writes,0);assert.equal(request.url,'https://api.openai.com/v1/images/edits');assert.equal(request.options.body.get('model'),'gpt-image-2');assert.equal(request.options.body.get('image[]').type,'image/jpeg');assert.match(request.options.body.get('prompt'),/SAME person/);
});
test('ownership and consent are required before image provider calls',async()=>{
  for(const [request,code]of[[{...body,userId:'other'},403],[{...body,consent:'true'},400]]){let calls=0;const res=response();await api({fetch:async()=>calls++})({method:'POST',body:request},res);assert.equal(res.code,code);assert.equal(calls,0);}
});
test('saving a portrait preserves voice/personality and returns a versioned image endpoint',async()=>{
  let saved;const res=response();await api({upsertRow:async(_,data)=>{saved=data;},fetch:async()=>{throw Error('should not generate');}})({method:'POST',body:{...body,action:'save'}},res);
  assert.equal(res.code,200);assert.equal(saved.traits.portrait,image);assert.equal(saved.traits.voice,'self:clone');assert.equal(saved.traits.persona,traits.persona);assert.match(res.body.avatar,/^\/api\/twin-portrait\?id=twin__owner&v=[a-f0-9]{16}$/);assert.equal(res.body.applied,true);
});
test('missing twin and save failure cannot report success',async()=>{
  for(const[overrides,code]of[[{getRow:async()=>null},409],[{upsertRow:async()=>{throw Error('offline');}},503]]){const res=response();await api(overrides)({method:'POST',body:{...body,action:'save'}},res);assert.equal(res.code,code);assert.equal(res.body.applied,undefined);}
});
test('malformed photos, arbitrary URLs and oversized images are rejected',()=>{
  for(const value of ['https://example.com/face.jpg','data:image/svg+xml;base64,PHN2Zz4=',image+'<script>', 'data:image/jpeg;base64,'+Buffer.alloc(300000).toString('base64')])assert.equal(imageHelpers.portraitBytes(value),null);
  assert.ok(imageHelpers.portraitBytes(image));
});
test('provider authentication and billing failures produce actionable errors without leaking provider response',async()=>{
  for(const[status,code,expected]of[[401,'invalid_api_key',/API key/],[429,'insufficient_quota',/credits/],[429,'credit_balance_exhausted',/credits/],[403,'access_denied',/access/]]){const res=response();await api({fetch:async()=>({ok:false,status,json:async()=>({error:{code,message:'secret detail'}})})})({method:'POST',body},res);assert.equal(res.code,502);assert.match(res.body.error,expected);assert.doesNotMatch(res.body.error,/secret detail/);}
});
test('removing portrait clears saved pixels and leaves the twin and voice intact',async()=>{
  let saved;const res=response();await api({getRow:async()=>({traits:{...traits,portrait:image,avatar:'/api/twin-portrait',avatarKind:'ai-portrait'}}),upsertRow:async(_,data)=>{saved=data;}})({method:'POST',body:{userId:'owner',action:'remove'}},res);
  assert.equal(res.body.avatar,null);assert.equal(saved.traits.portrait,undefined);assert.equal(saved.traits.avatar,undefined);assert.equal(saved.traits.voice,'self:clone');
});
test('public image endpoint only serves active twins with saved JPEG portraits',async()=>{
  for(const[data,code]of[[{...traits,portrait:image,avatarKind:'ai-portrait'},200],[{portrait:image,avatarKind:'ai-portrait'},404],[traits,404]]){const handler=load('pages/api/twin-portrait.js',{...imageHelpers,configured:()=>true,twinKey:id=>id,getRow:async()=>({traits:data})},['handler']).handler;const res=response();await handler({method:'GET',query:{id:'twin__owner'}},res);assert.equal(res.code,code);if(code===200){assert.equal(res.headers['Content-Type'],'image/jpeg');assert.equal(res.headers['Cache-Control'],'no-store');assert.deepEqual(res.body,bytes);}}
});
