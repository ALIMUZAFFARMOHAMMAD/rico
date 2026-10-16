const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createWorker, validateConfig, validateMeetingLink, identity } = require('../public/ricomates-meeting-worker.cjs');
function load(file, bindings, names) {
  const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '');
  const context = { module: {exports: {}}, console: {error() {}}, Buffer, URL, AbortSignal, process: {env: {}}, ...crypto, ...bindings };
  vm.runInNewContext(src + '\nmodule.exports={' + names.join(',') + '}', context); return context.module.exports;
}
const core = load('lib/meeting-core.js', {}, ['meetingUrl', 'validMeetingId', 'transcriptText', 'MEETING_STATUS', 'MEETING_PLATFORMS', 'MAX_TRANSCRIPT', 'vexaPlatform', 'terminalMeeting']);
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const meetingKey = (owner, id) => `${owner}::meeting::${id}`;
const owner = 'user_abc123'; const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const baseMeeting = {id, owner, platform:'meet', url:'https://meet.google.com/abc-defg-hij', state:'draft', operation:'idle', twinName:'Alex'};
const config = {appUrl:'https://ricomates.si', vexaUrl:'http://127.0.0.1:18056', pairToken:'token', vexaApiKey:'LOCAL_SECRET'};
function response() { return {code:200,setHeader(){},status(c){this.code=c;return this;},json(b){this.body=b;return this;},end(){return this;}}; }
const deviceModule = overrides => load('lib/meeting-device.js', { ...core, digest:hash, meetingKey, getRow:async()=>null, upsertRow:async()=>{}, ...overrides }, ['deviceOnline', 'pairDevice', 'authenticateDevice', 'validateSnapshot', 'compareUpdate', 'deviceKey']);
function api(overrides = {}) { return load('pages/api/meetings.js', {...core, ...deviceModule(), getAuth:()=>({userId:owner}), configured:()=>true,rateLimited:()=>false, getRow:async()=>null,upsertRow:async()=>{},twinKey:o=>'twin::'+o, getMeeting:async()=>({...baseMeeting}),listMeetings:async()=>[],saveMeeting:async()=>{},saveMeetingEvent:async()=>{},meetingDetail:async m=>({meeting:m,events:[]}),claimMeeting:async()=>true,meetingKey,digest:hash,deleteMeetingData:async()=>{},meetingEvents:async()=>[],generateMeetingNotes:async()=>{},draftMeetingReply:async()=>'',...overrides},['handler']).handler; }
async function call(handler, body, method='POST', query={}) {const res=response();await handler({method,body,query,headers:{}},res);return res;}
const ok = body => ({ok:true,status:200,json:async()=>body});
const voiceModule = overrides => load('lib/meeting-voice.js', {selfVoiceOn:()=>true,isSelfVoice:v=>v.startsWith('self:'),selfVoice:async()=>new Response(Buffer.from('ID3-test-audio')),...overrides}, ['validateMeetingSpeech','clonedMeetingAudio']);

test('meeting speech requires the saved clone and never falls back to another voice',async()=>{
  let calls=0; const voice=voiceModule({selfVoice:async()=>{calls++;return{ok:false};}});
  await assert.rejects(()=>voice.clonedMeetingAudio({voice:'self:test',voiceCloned:false},'Hello'));
  assert.equal(calls,0);
  await assert.rejects(()=>voice.clonedMeetingAudio({voice:'self:test',voiceCloned:true},'Hello'),/No substitute/);
  assert.equal(calls,1); assert.throws(()=>voice.validateMeetingSpeech('x'.repeat(241)));
});
test('cloned speech identifies itself as AI and accepts only bounded owner-approved text',async()=>{
  let text;const voice=voiceModule({selfVoice:async(route,body)=>{text=body.text;return new Response(Buffer.from('ID3audio'));}});
  const result=await voice.clonedMeetingAudio({name:'Alex',voice:'self:test',voiceCloned:true},'Please clarify the deadline.');
  assert.match(text,/Alex's AI twin/);assert.equal(result.format,'mp3');assert.equal(Buffer.from(result.audio_base64,'base64').toString(),'ID3audio');
});
test('voice join is refused when the runtime extension or clone is missing',async()=>{
  const handler=api({getRow:async key=>key.startsWith('twin::')?{traits:{voiceCloned:true}}:{traits:{ready:true,voiceVersion:0,expiresAt:new Date(Date.now()+60000).toISOString(),lastSeen:new Date().toISOString(),tokenHash:'hash'}}});
  const result=await call(handler,{action:'join',id,consent:true,voiceEnabled:true,voiceConsent:true});assert.equal(result.code,409);
});
test('speech job validates exact session and is never replayed after delivery uncertainty',async()=>{
  let sends=0, synths=0;
  const job={id,jobId:'voice-job',lease:'lease',type:'speak',platform:'meet',nativeId:'abc-defg-hij',providerId:7,voiceEnabled:true};
  const worker=createWorker(config,{fetch:async(url,opts)=>{
    if(url.endsWith('/api/meeting-worker')){synths++;return ok({format:'mp3',audio_base64:Buffer.from('ID3audio').toString('base64')});}
    if(url.endsWith('/meetings/7'))return ok({id:7,platform:'google_meet',native_meeting_id:'abc-defg-hij',status:'active'});
    if(url.endsWith('/speak')){sends++;throw new Error('timeout after delivery');}
    throw new Error('unexpected route');
  }});
  await worker.execute(job);await worker.execute(job);assert.equal(sends,1);assert.equal(synths,1);assert.equal(worker.state.jobs['voice-job'].result.ok,false);
});
test('speech cannot be sent to another occurrence of the same meeting',async()=>{
  let synths=0;const worker=createWorker(config,{fetch:async(url)=>{if(url.endsWith('/meetings/7'))return ok({id:8,platform:'google_meet',native_meeting_id:'abc-defg-hij',status:'active'});synths++;throw new Error('unexpected');}});
  await worker.execute({id,jobId:'wrong-session',lease:'lease',type:'speak',platform:'meet',nativeId:'abc-defg-hij',providerId:7,voiceEnabled:true});assert.equal(synths,0);assert.equal(worker.state.jobs['wrong-session'].result.ok,false);
});

test('meeting URLs reject lookalike domains, private URLs, credentials and wrong platforms',()=>{
  for(const url of ['http://meet.google.com/abc-defg-hij','https://meet.google.com.evil.test/abc-defg-hij','https://127.0.0.1/a','https://u:p@meet.google.com/abc-defg-hij','https://meet.google.com:444/abc-defg-hij']) {assert.throws(()=>core.meetingUrl(url,'meet'));assert.throws(()=>validateMeetingLink(url,'meet'));}
  assert.equal(core.meetingUrl(baseMeeting.url,'meet'),baseMeeting.url);assert.throws(()=>core.meetingUrl(baseMeeting.url,'teams'));
});
test('UUIDs are structurally validated',()=>{assert.equal(core.validMeetingId(id),true);assert.equal(core.validMeetingId('-'.repeat(36)),false);assert.equal(core.validMeetingId('x'.repeat(36)),false);});
test('sign-in and exact ownership required for meeting access',async()=>{
  const res=await call(api({getAuth:()=>({})}),{},'GET');assert.equal(res.code,401);
  const other=await call(api({getMeeting:async(o)=>{assert.equal(o,owner);return null;}}),{action:'notes',id,owner:'user_other'});assert.equal(other.code,404);
});
test('notes-only creation binds owner and requires explicit permission',async()=>{
  let saved;const handler=api({getMeeting:async()=>null,saveMeeting:async m=>{saved=m;}});
  assert.equal((await call(handler,{action:'create',id,title:'Review',platform:'notes',owner:'attacker',consent:false})).code,400);
  assert.equal((await call(handler,{action:'create',id,title:'Review',platform:'notes',owner:'attacker',consent:true})).code,201);assert.equal(saved.owner,owner);assert.equal(saved.url,null);
});
test('offline PC cannot enqueue a join',async()=>{let writes=0;const res=await call(api({saveMeeting:async m=>{if(m.jobState==='pending')writes++;}}),{action:'join',id,consent:true});assert.equal(res.code,409);assert.equal(writes,0);});
test('join needs consent, online PC and exclusive database claim',async()=>{
  const device={tokenHash:'hash',lastSeen:new Date().toISOString(),expiresAt:new Date(Date.now()+100000).toISOString(),ready:true};
  let queued;
  const handler=api({getRow:async()=>({traits:device}),saveMeeting:async m=>{if(m.jobState==='pending')queued=m;}});
  assert.equal((await call(handler,{action:'join',id,consent:false})).code,400);
  assert.equal((await call(handler,{action:'join',id,consent:true})).code,202);assert.equal(queued.jobType,'join');assert.equal(queued.deviceHash,'hash');assert.equal(queued.operation,'worker');
  assert.equal((await call(api({claimMeeting:async()=>false}),{action:'join',id,consent:true})).code,409);
});
test('import limit counts existing transcript and rejects combining with live sessions',async()=>{
  assert.equal((await call(api({meetingEvents:async()=>[{type:'transcript',text:'x'.repeat(99999)}]}),{action:'import',id,importId:id,text:'new text',consent:true})).code,400);
  assert.equal((await call(api({getMeeting:async()=>({...baseMeeting,deviceHash:'hash'})}),{action:'import',id,importId:id,text:'hello',consent:true})).code,409);
});
test('revocation removes token hash so a delayed heartbeat cannot revive it',async()=>{let saved;const res=await call(api({getRow:async()=>({traits:{owner,tokenHash:'hash'}}),upsertRow:async(_,row)=>{saved=row.traits;}}),{action:'revoke',confirm:true});assert.equal(res.code,200);assert.equal(saved.tokenHash,null);assert.equal(saved.revoked,true);});
test('pair tokens are owner-bound, hashed, expiring and revocable',async()=>{
  let stored;const mod=deviceModule({upsertRow:async(_,row)=>{stored=row;},getRow:async()=>stored});
  const pair=await mod.pairDevice(owner);assert.notEqual(stored.traits.tokenHash,pair.token);assert.equal(stored.traits.tokenHash,hash(pair.token));
  assert.equal((await mod.authenticateDevice('Bearer '+pair.token)).owner,owner);
  assert.equal(await mod.authenticateDevice('Bearer '+pair.token.slice(0,-1)+'z'),null);
  stored.traits.expiresAt=new Date(0).toISOString();assert.equal(await mod.authenticateDevice('Bearer '+pair.token),null);
});
test('PC online expires and snapshots reject wrong meeting identities / partial text',()=>{
  const mod=deviceModule();assert.equal(mod.deviceOnline({ready:true,lastSeen:new Date(Date.now()-50000).toISOString(),expiresAt:new Date(Date.now()+100000).toISOString()}),false);
  const m={...baseMeeting,providerId:12,nativeId:'abc-defg-hij'};
  const data={providerId:12,nativeId:m.nativeId,platform:'google_meet',status:'active',segments:[{segment_id:'1',speaker:'Alex',text:'Confirmed',start:0,completed:true},{segment_id:'2',text:'Partial',start:1,completed:false}]};
  assert.equal(mod.validateSnapshot(m,data).segments.length,1);
  assert.throws(()=>mod.validateSnapshot(m,{...data,providerId:13}));assert.throws(()=>mod.validateSnapshot(m,{...data,platform:'teams'}));
  assert.throws(()=>mod.validateSnapshot(m,{...data,segments:[data.segments[0],data.segments[0]]}));
});
test('notes validation rejects invented structure and preserves explicitly empty owners',()=>{
  const {validateNotes}=load('lib/meeting-ai.js',{},['validateNotes']);const notes={summary:'Review',keyPoints:[],decisions:[],actions:[{task:'Review draft',owner:'',due:''}],openQuestions:[],importantMoments:[]};
  assert.equal(validateNotes(notes).actions[0].owner,'');assert.throws(()=>validateNotes({...notes,actions:[{task:'x',owner:null,due:''}]}));
});
test('cloud and local credentials cannot be redirected to arbitrary hosts',()=>{
  const good={...config,pairToken:'dXNlcl9hYmM.'+'a'.repeat(64)};assert.equal(validateConfig(good).appUrl,'https://ricomates.si');
  for(const bad of [{appUrl:'https://evil.test'},{vexaUrl:'http://192.168.1.5:18056'},{vexaUrl:'http://user:pw@localhost:18056'}]) assert.throws(()=>validateConfig({...good,...bad}));
});
test('worker journals before joining; retrying a job never creates a second bot',async()=>{
  let joins=0, journaled=false;const worker=createWorker(config,{persist:()=>{journaled=true;},fetch:async(url,opts)=>{assert.equal(journaled,true);assert.equal(opts.headers['X-API-Key'],'LOCAL_SECRET');assert.equal(JSON.parse(opts.body).recording_enabled,false);joins++;return ok({id:12,platform:'google_meet',native_meeting_id:'abc-defg-hij'});}});
  const job={...baseMeeting,jobId:'job1',lease:'lease1',type:'join'};await worker.execute(job);await worker.execute(job);assert.equal(joins,1);assert.equal(worker.state.jobs.job1.result.providerId,12);
});
test('ambiguous timeout is never retried, including after process restart',async()=>{
  let calls=0;const state={jobs:{},active:{},hashes:{}};const request=async()=>{calls++;throw new Error('timeout');};const job={...baseMeeting,jobId:'job1',lease:'lease1',type:'join'};
  await createWorker(config,{state,fetch:request}).execute(job);await createWorker(config,{state,fetch:request}).execute(job);assert.equal(calls,1);assert.equal(state.jobs.job1.result.ok,false);
});
test('acknowledgment retry does not replay the join or expose the local Vexa key',async()=>{
  let acks=0,joins=0;const worker=createWorker(config,{fetch:async(url,opts)=>{if(url.includes('/bots')){joins++;return ok({id:12,platform:'google_meet',native_meeting_id:'abc-defg-hij'});}acks++;assert.equal(opts.headers['X-API-Key'],undefined);assert.equal(opts.body.includes('LOCAL_SECRET'),false);if(acks===1)throw new Error('offline');return ok({accepted:true});}});
  await worker.execute({...baseMeeting,jobId:'job1',lease:'lease1',type:'join'});await assert.rejects(worker.flush());await worker.flush();assert.equal(joins,1);assert.equal(acks,2);assert.equal(worker.state.jobs.job1.acknowledged,true);
});
test('stop refuses another occurrence with the same meeting link',async()=>{
  let deletes=0;const worker=createWorker(config,{fetch:async(url,opts)=>{if(opts.method==='DELETE')deletes++;return ok({id:99,platform:'google_meet',native_meeting_id:'abc-defg-hij',status:'active'});}});
  await worker.execute({...baseMeeting,providerId:12,nativeId:'abc-defg-hij',jobId:'leave1',lease:'lease1',type:'leave'});assert.equal(deletes,0);assert.equal(worker.state.jobs.leave1.result.ok,false);
});
test('terminal meetings are never stopped by native ID',async()=>{
  let deletes=0;const worker=createWorker(config,{fetch:async(url,opts)=>{if(opts.method==='DELETE')deletes++;return ok({id:12,platform:'google_meet',native_meeting_id:'abc-defg-hij',status:'completed'});}});
  await worker.execute({...baseMeeting,providerId:12,nativeId:'abc-defg-hij',jobId:'leave1',lease:'lease1',type:'leave'});assert.equal(deletes,0);assert.equal(worker.state.jobs.leave1.result.ok,true);
});
test('simulated Vexa cycle joins, syncs confirmed text and acknowledges once',async()=>{
  let polls=0, joins=0;const snapshots=[];const job={...baseMeeting,jobId:'job1',lease:'lease1',type:'join'};const m={id,platform:'meet',providerId:12,nativeId:'abc-defg-hij'};
  const worker=createWorker(config,{fetch:async(url,opts)=>{
    if(url.endsWith('/auth/me'))return ok({scopes:['bot','tx']});
    if(url.endsWith('/bots')){joins++;return ok({id:12,platform:'google_meet',native_meeting_id:m.nativeId});}
    if(url.includes('/transcripts/by-id/'))return ok({id:12,platform:'google_meet',native_meeting_id:m.nativeId,status:'active',segments:[{segment_id:'1',speaker:'A',text:'Hello',start:0,completed:true},{segment_id:'2',text:'Draft',completed:false}]});
    const body=JSON.parse(opts.body);if(body.action==='poll'){polls++;return ok({jobs:polls===1?[job]:[],meetings:polls>1?[m]:[]});}if(body.action==='snapshot')snapshots.push(body);return ok({accepted:true});
  }});
  await worker.tick();await worker.tick();await worker.tick();assert.equal(joins,1);assert.equal(snapshots.length,1);assert.equal(snapshots[0].segments.length,1);
});
test('meeting API rejects unsupported chat sending',async()=>{assert.equal((await call(api(),{action:'send',id,text:'hello',approved:true})).code,400);});
test('local session identity must include record ID, platform and native ID',()=>{assert.throws(()=>identity({id:12,platform:'zoom',native_meeting_id:'123'},{providerId:12,platform:'meet',nativeId:'abc-defg-hij'}));});
function workerApi(overrides={}) {return load('pages/api/meeting-worker.js',{...core,...deviceModule(),configured:()=>true,authenticateDevice:async()=>({owner,tokenHash:'hash'}),compareUpdate:async()=>true,getMeeting:async()=>({...baseMeeting,deviceHash:'hash',jobId:'job1',jobLease:'lease1',jobState:'running',jobType:'join',operation:'worker'}),listMeetings:async()=>[],meetingKey,deleteMeetingData:async()=>{},claimMeeting:async()=>true,saveMeeting:async()=>{},getRow:async()=>null,upsertRow:async()=>{},waitUntil:()=>{},generateMeetingNotes:async()=>{},...overrides},['handler']).handler;}

test('cloned audio is synthesized once per exact lease and restores the result state before delivery',async()=>{
  let current={...baseMeeting,deviceHash:'hash',jobId:'speech1',jobLease:'lease1',jobState:'running',jobType:'speak',state:'active',voiceEnabled:true,speechText:'Hello'};
  let synths=0;
  const handler=workerApi({twinKey:()=> 'twin',getRow:async()=>({traits:{voiceCloned:true}}),getMeeting:async()=>current,compareUpdate:async(k,f,e,next)=>{if(current[f]!==e)return false;current=next;return true;},clonedMeetingAudio:async()=>{synths++;assert.equal(current.jobState,'synthesizing');return {format:'mp3',audio_base64:'SUQz'};}});
  const body={action:'voice',id,jobId:'speech1',lease:'lease1'};
  assert.equal((await call(handler,{...body,lease:'wrong'})).code,409);
  assert.equal((await call(handler,body)).code,200);
  assert.equal(current.jobState,'running');
  assert.equal((await call(handler,body)).code,409);assert.equal(synths,1);
});

test('revoking the PC during synthesis prevents returning cloned audio',async()=>{
  let current={...baseMeeting,deviceHash:'hash',jobId:'speech1',jobLease:'lease1',jobState:'running',jobType:'speak',state:'active',voiceEnabled:true,speechText:'Hello'};
  let revoked=false;
  const handler=workerApi({twinKey:()=> 'twin',authenticateDevice:async()=>revoked?null:{owner,tokenHash:'hash'},getRow:async()=>({traits:{voiceCloned:true}}),getMeeting:async()=>current,compareUpdate:async(k,f,e,next)=>{current=next;return true;},clonedMeetingAudio:async()=>{revoked=true;return {audio_base64:'privateaudio'};}});
  const result=await call(handler,{action:'voice',id,jobId:'speech1',lease:'lease1'});
  assert.equal(result.code,401);assert.equal(result.body,undefined);assert.equal(current.jobState,'running');
});

test('voice service rejects oversized streams and detects WAV without relabeling it MP3',async()=>{
  const oversized=voiceModule({selfVoice:async()=>new Response(Buffer.alloc(1024*1024+1))});
  await assert.rejects(()=>oversized.clonedMeetingAudio({voiceCloned:true,voice:'self:test'},'Hello'),/audio limit/);
  const wav=Buffer.alloc(44);wav.write('RIFF');wav.write('WAVE',8);
  const voice=voiceModule({selfVoice:async()=>new Response(wav)});
  assert.equal((await voice.clonedMeetingAudio({voiceCloned:true,voice:'self:test'},'Hello')).format,'wav');
});
test('worker endpoint rejects missing pairing, another PC and forged leases',async()=>{
  assert.equal((await call(workerApi({authenticateDevice:async()=>null}),{action:'poll',ready:true})).code,401);
  assert.equal((await call(workerApi({getMeeting:async()=>({...baseMeeting,deviceHash:'other'})}),{action:'result',id,jobId:'job1',lease:'lease1',ok:true})).code,404);
  assert.equal((await call(workerApi(),{action:'result',id,jobId:'job1',lease:'wrong',ok:true})).code,409);
});
test('worker claims queued jobs atomically and never returns another PC jobs',async()=>{
  let claimed=false;const handler=workerApi({listMeetings:async()=>[{...baseMeeting,deviceHash:'hash',jobState:'pending',jobId:'job1',jobType:'join'},{...baseMeeting,id:'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee',deviceHash:'other',jobState:'pending'}],compareUpdate:async(key,field)=>{if(field==='tokenHash')return true;if(claimed)return false;claimed=true;return true;}});
  assert.equal((await call(handler,{action:'poll',ready:true})).body.jobs.length,1);assert.equal((await call(handler,{action:'poll',ready:true})).body.jobs.length,0);
});
test('join result retry is idempotent and provider IDs are validated',async()=>{
  let saved;const result={action:'result',id,jobId:'job1',lease:'lease1',ok:true,providerId:12,nativeId:'abc-defg-hij'};
  assert.equal((await call(workerApi(),{...result,providerId:'12'})).code,400);
  const h=workerApi({getMeeting:async()=>saved||({...baseMeeting,deviceHash:'hash',jobId:'job1',jobLease:'lease1',jobState:'running',jobType:'join',operation:'worker'}),compareUpdate:async(k,f,e,next)=>{saved=next;return true;}});
  assert.equal((await call(h,result)).code,200);assert.equal(saved.providerId,12);assert.equal(saved.operation,'idle');assert.equal((await call(h,result)).code,200);
});
test('snapshot cannot write during deletion and cannot cross provider session IDs',async()=>{
  let writes=0;const m={...baseMeeting,deviceHash:'hash',providerId:12,nativeId:'abc-defg-hij'};const data={action:'snapshot',id,providerId:12,nativeId:'abc-defg-hij',platform:'google_meet',status:'active',segments:[]};
  const h=workerApi({getMeeting:async()=>m,claimMeeting:async()=>false,upsertRow:async()=>writes++});
  assert.equal((await call(h,data)).code,409);assert.equal(writes,0);
  assert.equal((await call(h,{...data,providerId:99})).code,502);assert.equal(writes,0);
});
test('import retry does not duplicate a previously accepted large transcript',async()=>{
  let writes=0;const h=api({meetingEvents:async()=>[{id:hash('import:'+id),type:'transcript',text:'x'.repeat(99000)}],saveMeetingEvent:async()=>writes++});
  assert.equal((await call(h,{action:'import',id,importId:id,text:'x'.repeat(99000),consent:true})).code,200);assert.equal(writes,0);
});
test('meeting records are excluded from memory even if database LIKE overmatches',async()=>{
  const rows=[{user_id:owner},{user_id:owner+'::agent::friend'},{user_id:owner+'::meeting::'+id},{user_id:'user_other::agent::friend'}];
  const {getUserRows}=load('lib/db.js',{fetch:async()=>({ok:true,text:async()=>JSON.stringify(rows)})},['getUserRows']);
  const result=await getUserRows(owner);assert.equal(result.some(r=>r.user_id.includes('::meeting::')),false);assert.equal(result.some(r=>r.user_id.startsWith('user_other')),false);
});
