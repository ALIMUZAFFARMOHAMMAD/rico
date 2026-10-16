const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const { createWorker } = require('../public/ricomates-meeting-worker.cjs');
function load(file, bindings, names) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '');
  const context = { module: { exports: {} }, Date, process: { env: { ANTHROPIC_API_KEY: 'test' } }, ...crypto, ...bindings };
  vm.runInNewContext(source + '\nmodule.exports={' + names.join(',') + '}', context); return context.module.exports;
}
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
function fixture(overrides = {}) {
  const rows = new Map();
  let meeting = { owner: 'user_test', id: 'test', state: 'active', operation: 'idle', providerId: 7, deviceHash: 'hash', platform: 'meet', voiceEnabled: true };
  const device = { owner: 'user_test', ready: true, autoVersion: 1, voiceVersion: 1, tokenHash: 'hash' };
  rows.set('twin', { persona: 'Friendly and concise. I build Ricomates.', voiceCloned: true });
  rows.set('meeting::snapshot', { providerId: 7, status: 'active', receivedAt: new Date().toISOString(), segments: [] });
  const auto = load('lib/meeting-auto.js', { digest: hash, meetingKey: () => 'meeting', twinKey: () => 'twin', twinIdentityPrompt: t => t?.persona || '', getRow: async key => rows.has(key) ? { traits: structuredClone(rows.get(key)) } : null, upsertRow: async (key, row) => rows.set(key, structuredClone(row.traits)), getMeeting: async () => structuredClone(meeting), saveMeeting: async m => { meeting = structuredClone(m); }, deviceOnline: d => d?.ready,
    claimMeeting: async (m, operation) => { if (meeting.operation !== 'idle') return false; meeting = { ...meeting, operation }; return true; },
    compareUpdate: async (key, field, expected, next) => { if (rows.get(key)?.[field] !== expected) return false; rows.set(key, structuredClone(next)); return true; },
    meetingAI: async () => '{"reply":"I would start with a small, friendly prototype."}', ...overrides,
  }, ['configureAuto', 'automaticTurn', 'getAuto', 'pauseAuto', 'automaticSpeechAllowed', 'addressedQuestion', 'parseAutomaticReply', 'transcriptFingerprint']);
  async function enable(extra = {}) { return auto.configureAuto(meeting, device, { enabled: true, consent: true, callName: 'Rico', ...extra }); }
  function hear(text, order = 1, speaker = 'Muzaffar') { const s = rows.get('meeting::snapshot'); s.segments.push({ id: 's' + order, order, speaker, text }); return { fingerprint: auto.transcriptFingerprint(s.segments), quietSince: Date.now() - 7000 }; }
  return { auto, rows, device, enable, hear, get meeting() { return meeting; }, changeMeeting: patch => { meeting = { ...meeting, ...patch }; } };
}
test('automatic mode requires consent, clone, live speech and updated connector', async () => {
  const f = fixture();
  await assert.rejects(() => f.enable({ consent: false }), /Confirm/);
  f.device.autoVersion = 0; await assert.rejects(() => f.enable(), /updated PC/);
  f.device.autoVersion = 1; f.rows.get('twin').voiceCloned = false; await assert.rejects(() => f.enable(), /cloned voice/);
  assert.equal(f.rows.has('meeting::auto'), false);
});
test('question gate rejects other people, name substrings, self voice and oversized utterances', () => {
  const { auto } = fixture(); const q = (text, speaker = 'Person') => auto.addressedQuestion([{ text, speaker }], 'Rico');
  assert.equal(q('What do you think?'), null); assert.equal(q('Ricomates, what is next?'), null);
  assert.equal(q('Rico is here.'), null); assert.equal(q('Rico, what next?', 'Alex · AI twin'), null);
  assert.equal(q("I'm Alex's AI twin. Rico, what next?"), null);
  assert.equal(q('Rico, ' + 'what '.repeat(500)), null);
  assert.equal(q('Rico, tell us your thoughts'), 'Rico, tell us your thoughts');
});
test('old transcript and partial silence cannot trigger generation; exactly one duplicate turn wins', async () => {
  let generations = 0; const f = fixture({ meetingAI: async () => { generations++; return '{"reply":"Hello."}'; } });
  const old = f.hear('Rico, what was the old question?'); await f.enable();
  assert.equal((await f.auto.automaticTurn(f.meeting, f.device, old)).queued, false);
  const body = f.hear('Rico, what is next?', 2);
  assert.equal((await f.auto.automaticTurn(f.meeting, f.device, { ...body, quietSince: Date.now() })).queued, false);
  const result = await Promise.all([f.auto.automaticTurn(f.meeting, f.device, body), f.auto.automaticTurn(f.meeting, f.device, body)]);
  assert.equal(generations, 1); assert.equal(result.filter(r => r.queued).length, 1);
  assert.equal(f.meeting.jobType, 'speak'); assert.equal(f.meeting.speechText, 'Hello.');
});
test('pause during generation discards the answer and does not reserve a speech job', async () => {
  let complete, started; const start = new Promise(r => { started = r; });
  const f = fixture({ meetingAI: () => { started(); return new Promise(r => { complete = r; }); } });
  await f.enable(); const turn = f.auto.automaticTurn(f.meeting, f.device, f.hear('Rico, what is next?'));
  await start; await f.auto.pauseAuto(f.meeting); complete('{"reply":"Discard me."}');
  assert.equal((await turn).queued, false); assert.equal(f.meeting.jobId, undefined); assert.ok(f.rows.get('meeting::auto').stopId);
});
test('new speech or a finished meeting during generation discards stale replies', async () => {
  for (const change of ['speech', 'leave']) {
    let complete, started; const start = new Promise(r => { started = r; });
    const f = fixture({ meetingAI: () => { started(); return new Promise(r => { complete = r; }); } });
    await f.enable(); const turn = f.auto.automaticTurn(f.meeting, f.device, f.hear('Rico, what is next?'));
    await start; if (change === 'speech') f.hear('Actually, never mind.', 2); else f.changeMeeting({ state: 'completed' });
    complete('{"reply":"Too late."}'); assert.equal((await turn).queued, false); assert.equal(f.meeting.jobId, undefined);
  }
});
test('malformed model output pauses without retries; changed profile requires renewed enable', async () => {
  const f = fixture({ meetingAI: async () => '```{"reply":"bad"}```' });
  await f.enable(); await f.auto.automaticTurn(f.meeting, f.device, f.hear('Rico, what is next?'));
  assert.equal(f.rows.get('meeting::auto').enabled, false); assert.equal(f.meeting.jobId, undefined);
  const g = fixture(); await g.enable(); g.rows.get('twin').persona = 'Changed';
  await g.auto.automaticTurn(g.meeting, g.device, g.hear('Rico, what is next?')); assert.equal(g.rows.get('meeting::auto').enabled, false);
});
test('expiry, reply budget, cooldown and paused generation fence prevent new audio', async () => {
  for (const patch of [{ expiresAt: '2000-01-01' }, { count: 40 }]) {
    const f = fixture(); await f.enable(); Object.assign(f.rows.get('meeting::auto'), patch);
    assert.equal((await f.auto.automaticTurn(f.meeting, f.device, f.hear('Rico, what is next?'))).queued, false);
  }
  const f = fixture(); await f.enable(); await f.auto.automaticTurn(f.meeting, f.device, f.hear('Rico, what is next?'));
  assert.equal(await f.auto.automaticSpeechAllowed(f.meeting), true);
  await f.auto.pauseAuto(f.meeting); assert.equal(await f.auto.automaticSpeechAllowed(f.meeting), false);
  const g = fixture(); await g.enable(); g.changeMeeting({ lastSpeechAt: new Date().toISOString() });
  assert.equal((await g.auto.automaticTurn(g.meeting, g.device, g.hear('Rico, what is next?'))).queued, false);
});
test('strict answer schema rejects extra fields, controls and overlong replies', () => {
  const { auto } = fixture();
  for (const raw of ['{}', '{"reply":1}', '{"reply":"ok","action":"send"}', JSON.stringify({ reply: 'x'.repeat(241) }), JSON.stringify({ reply: '\u0000' })]) assert.throws(() => auto.parseAutomaticReply(raw));
  assert.equal(auto.parseAutomaticReply('{"reply":null}'), null);
});
const ok = body => ({ ok: true, status: 200, json: async () => body });
const config = { appUrl: 'https://ricomates.si', vexaUrl: 'http://localhost:18056', pairToken: 'test', vexaApiKey: 'test' };
test('worker final authorization refuses paused automatic audio before local playback', async () => {
  let sends = 0;
  const worker = createWorker(config, { fetch: async (url) => {
    if (url.endsWith('/meetings/7')) return ok({ id: 7, platform: 'google_meet', native_meeting_id: 'abc-defg-hij', status: 'active' });
    if (url.endsWith('/api/meeting-worker')) return ok({ format: 'mp3', audio_base64: 'SUQz' });
    if (url.endsWith('/transcripts/by-id/7')) return ok({ id: 7, platform: 'google_meet', native_meeting_id: 'abc-defg-hij', segments: [] });
    if (url.endsWith('/api/meeting-auto')) return { ok: false, status: 409 };
    sends++; return ok({});
  } });
  await worker.execute({ id: 'm', jobId: 'j', lease: 'l', type: 'speak', automatic: true, autoFingerprint: hash('[]'), voiceEnabled: true, providerId: 7, nativeId: 'abc-defg-hij', platform: 'meet' });
  assert.equal(sends, 0); assert.equal(worker.state.jobs.j.result.ok, false);
});
test('worker keeps heartbeats and pause delivery flowing while generation is pending', async () => {
  let time = Date.now(), text = 'hello', turns = 0, polls = 0, stops = 0, stopped = 0, complete;
  let auto = { enabled: true, generation: 'g' };
  const m = { id: 'm', platform: 'meet', providerId: 7, nativeId: 'abc-defg-hij' };
  const worker = createWorker(config, { now: () => time, fetch: async (url, opts) => {
    const body = opts.body ? JSON.parse(opts.body) : {};
    if (url.endsWith('/auth/me')) return ok({ scopes: ['bot', 'tx'] });
    if (url.endsWith('/voice-capabilities')) return ok({ version: 1, platforms: ['google_meet'] });
    if (url.endsWith('/api/meeting-worker')) { if (body.action === 'poll') { polls++; return ok({ jobs: [], meetings: [{ ...m, auto }] }); } return ok({ accepted: true }); }
    if (url.endsWith('/api/meeting-auto')) { if (body.action === 'turn') { turns++; return new Promise(r => { complete = () => r(ok({ queued: false })); }); } stopped++; return ok({ accepted: true }); }
    if (url.includes('/speak?')) { stops++; return ok({}); }
    if (url.endsWith('/meetings/7')) return ok({ id: 7, platform: 'google_meet', native_meeting_id: m.nativeId, status: 'active' });
    return ok({ id: 7, platform: 'google_meet', native_meeting_id: m.nativeId, status: 'active', segments: [{ segment_id: 's', text, completed: true, start: 0, speaker: 'Person' }] });
  } });
  await worker.tick(); time += 7000; await worker.tick(); assert.equal(turns, 0, 'startup transcript must be ignored');
  text = 'Rico, what is next?'; await worker.tick(); time += 7000; await worker.tick(); assert.equal(turns, 1);
  auto = { enabled: false, generation: 'paused', stopId: 'stop' }; await worker.tick();
  assert.equal(polls, 5); assert.equal(stops, 1); assert.equal(stopped, 1); complete(); await worker.drain();
});
test('automatic endpoint isolates owner configuration and PC bearer actions', async () => {
  let configured = 0, turns = 0;
  const api = overrides => load('pages/api/meeting-auto.js', {
    configured: () => true, getAuth: () => ({ userId: null }), validMeetingId: () => true,
    getMeeting: async () => ({ owner: 'owner', id: 'm', deviceHash: 'expected' }),
    getRow: async () => null, deviceKey: () => 'device', rateLimited: () => false,
    configureAuto: async () => { configured++; }, automaticTurn: async () => { turns++; },
    authenticateDevice: async () => null, ...overrides,
  }, ['handler']).handler;
  async function call(handler, action) {
    const res = { code: 200, setHeader() {}, status(c) { this.code = c; return this; }, end() { return this; }, json(b) { this.body = b; return this; } };
    await handler({ method: 'POST', body: { id: 'm', action }, headers: { authorization: 'Bearer untrusted' } }, res); return res;
  }
  assert.equal((await call(api(), 'configure')).code, 401);
  assert.equal((await call(api(), 'turn')).code, 401);
  assert.equal((await call(api({ authenticateDevice: async () => ({ owner: 'owner', tokenHash: 'different' }) }), 'turn')).code, 404);
  assert.equal(configured, 0); assert.equal(turns, 0);
});
