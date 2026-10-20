const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function load(file, bindings, names) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export default /g, '').replace(/export /g, '');
  const context = { module: { exports: {} }, console: { error() {} }, AbortSignal, process: { env: { ANTHROPIC_API_KEY: 'test', NEXT_PUBLIC_SUPABASE_URL: 'https://db.test' } }, ...bindings };
  vm.runInNewContext(source + '\nmodule.exports={' + names.join(',') + '}', context); return context.module.exports;
}
const identity = load('lib/twin-identity.js', {}, ['validateIdentity', 'identityFromTwin', 'twinIdentityPrompt', 'canAccessTwin', 'validateStudioInput']);
const profile = { name: 'Alex', style: 'Warm, direct, short sentences.', values: 'Curiosity', knowledge: 'I enjoy chess.', boundaries: 'Confirm plans with me.', examples: 'Let us try it.', discoverable: false };
const twin = { ...profile, persona: 'Legacy persona', identity: profile, voice: 'self:private-clone', voiceCloned: true, avatar: 'saved-image' };
const row = { traits: twin, updated_at: '2026-10-15T10:00:00Z' };
const twinKey = id => 'twin::' + id;
function api(overrides = {}) {
  return load('pages/api/twin-studio.js', { ...identity, getAuth: () => ({ userId: 'owner' }), configured: () => true, rateLimited: () => false, twinKey, getRow: async () => row, upsertRow: async () => {}, twinLook: () => ({}), twinVoice: () => 'stock', listTwins: async () => [], AGENT_LIST: [], resolveAgent: async () => null, randomUUID: () => 'result-id', meetingAI: async () => 'AI twin: I enjoy chess.', ...overrides }, ['handler']).handler;
}
async function call(handler, body, method = 'POST') {
  const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; }, end() { return this; } };
  await handler({ method, body, headers: {} }, res); return res;
}
test('profile validation strips extra fields, bounds text and requires explicit sharing choice', () => {
  assert.equal(identity.validateIdentity({ ...profile, voice: 'attacker' }).voice, undefined);
  for (const bad of [{ ...profile, style: '' }, { ...profile, knowledge: 'a'.repeat(3001) }, { ...profile, discoverable: 'true' }, { ...profile, name: [] }]) assert.throws(() => identity.validateIdentity(bad));
  assert.equal(identity.identityFromTwin(null).discoverable, false);
  assert.equal(identity.identityFromTwin({ name: 'Old', persona: 'x'.repeat(1500) }).style.length, 1000);
});
test('approved identity excludes old private memory and requires uncertainty and AI disclosure', () => {
  const prompt = identity.twinIdentityPrompt({ ...twin, persona: 'OLD_PRIVATE_SECRET' });
  assert.match(prompt, /clearly disclosed AI twin/); assert.match(prompt, /owner to confirm/);
  assert.match(prompt, /I enjoy chess/); assert.doesNotMatch(prompt, /OLD_PRIVATE_SECRET/);
});
test('discussion validates roster and rehearsal cannot pull in someone else', () => {
  for (const body of [{ action: 'discuss', prompt: 'Hello' }, { action: 'rehearse', prompt: 'Hi', partnerIds: ['twin__other'] }, { action: 'create', prompt: 'Hi', partnerIds: [''] }, { action: 'create', prompt: 'x'.repeat(2001) }]) assert.throws(() => identity.validateStudioInput(body));
});
test('private twin access is owner-only and missing records fail closed', async () => {
  const lib = load('lib/twins.js', { ...identity, getRow: async () => row, AGENTS: { tony: { id: 'tony' } } }, ['resolveAgent']);
  assert.equal(await lib.resolveAgent('twin__owner', 'other'), null);
  assert.equal(await lib.resolveAgent('twin__owner'), null);
  assert.equal((await lib.resolveAgent('twin__owner', 'owner')).voice, 'self:private-clone');
});
test('shared twins expose stock voices, never their owners cloned voice', async () => {
  const lib = load('lib/twins.js', { ...identity, getRow: async () => ({ traits: { ...twin, discoverable: true } }), AGENTS: {} }, ['resolveAgent']);
  const publicTwin = await lib.resolveAgent('twin__owner', 'other');
  assert.equal(publicTwin.voiceCloned, false); assert.notEqual(publicTwin.voice, twin.voice);
});
test('community discovery removes private, malformed and excluded owner records', async () => {
  const lib = load('lib/twins.js', { ...identity, AGENTS: {}, sb: async () => [{ user_id: 'twin::owner', traits: { ...twin, discoverable: true } }, { user_id: 'twin::private', traits: twin }, { user_id: 'twinXXbad', traits: { ...twin, discoverable: true } }] }, ['listTwins']);
  assert.equal((await lib.listTwins()).length, 1); assert.equal((await lib.listTwins('owner')).length, 0);
});
test('studio refuses signed-out, unavailable storage and throttled requests before any database read', async () => {
  const getRow = async () => { throw Error('must not read'); };
  assert.equal((await call(api({ getRow, getAuth: () => ({}) }), {}, 'GET')).code, 401);
  assert.equal((await call(api({ getRow, configured: () => false }), {})).code, 503);
  assert.equal((await call(api({ getRow, rateLimited: () => true }), {})).code, 429);
});
test('studio read is uncached and never returns raw clone credentials', async () => {
  const res = await call(api(), null, 'GET'); assert.equal(res.code, 200); assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.stringify(res.body).includes('self:private-clone'), false);
});
test('save requires consent and matching revision; preserves saved avatar and voice', async () => {
  let writes = 0;
  const handler = api({ fetch: async (url, options) => { writes++; assert.match(url, /updated_at=eq\./); const body = JSON.parse(options.body); assert.equal(body.traits.voice, twin.voice); assert.equal(body.traits.avatar, twin.avatar); assert.equal(body.traits.identity.knowledge, profile.knowledge); return { ok: true, json: async () => [body] }; } });
  const body = { action: 'save', profile, revision: row.updated_at, consent: true, userId: 'other' };
  assert.equal((await call(handler, { ...body, consent: false })).code, 400);
  assert.equal((await call(handler, { ...body, revision: 'stale' })).code, 409);
  assert.equal(writes, 0); assert.equal((await call(handler, body)).code, 200); assert.equal(writes, 1);
});
test('concurrent profile update is detected without reporting a false save', async () => {
  const res = await call(api({ fetch: async () => ({ ok: true, json: async () => [] }) }), { action: 'save', profile, consent: true, revision: row.updated_at }); assert.equal(res.code, 409);
});
test('missing AI configuration still allows profiles to load', async () => {
  const handler = api({ process: { env: {} } });
  assert.equal((await call(handler, null, 'GET')).body.aiReady, false);
  assert.equal((await call(handler, { action: 'rehearse', prompt: 'Hi' })).code, 503);
});
test('private, unknown and self-only discussion partners never reach the model', async () => {
  let calls = 0; const handler = api({ meetingAI: async () => { calls++; } });
  assert.equal((await call(handler, { action: 'discuss', prompt: 'Hello', partnerIds: ['twin__other'] })).code, 404);
  assert.equal((await call(handler, { action: 'discuss', prompt: 'Hello', partnerIds: ['twin__owner'] })).code, 400);
  assert.equal(calls, 0);
});
test('model receives approved facts, AI disclosure rules and no clone credentials', async () => {
  const res = await call(api({ meetingAI: async (system, content) => { assert.match(system, /AI twin/); assert.match(system, /untrusted/); assert.match(JSON.stringify(content), /I enjoy chess/); assert.doesNotMatch(JSON.stringify(content), /self:private/); return 'AI twin: I enjoy chess.'; } }), { action: 'rehearse', prompt: 'What do you enjoy?' });
  assert.equal(res.code, 200); assert.equal(res.body.aiGenerated, true);
});
test('withdrawn sharing and owner changes during generation suppress the output', async () => {
  let count = 0; const partner = { id: 'twin__other', name: 'Sam', persona: 'kind', isTwin: true };
  const first = await call(api({ resolveAgent: async () => ++count === 1 ? partner : null }), { action: 'discuss', prompt: 'Hello', partnerIds: [partner.id] }); assert.equal(first.code, 409); assert.equal(first.body.output, undefined);
  count = 0; const second = await call(api({ getRow: async () => ++count === 1 ? row : { ...row, updated_at: 'changed' } }), { action: 'rehearse', prompt: 'Hello' }); assert.equal(second.code, 409); assert.equal(second.body.output, undefined);
});
test('speech endpoint resolves the authenticated viewer and never spends credits on a private twin', async () => {
  let spent = false;
  const handler = load('pages/api/tts.js', { getAuth: () => ({ userId: 'viewer' }), rateLimited: () => false, resolveAgent: async (id, viewer) => { assert.equal(id, 'twin__owner'); assert.equal(viewer, 'viewer'); return null; }, fetch: async () => { spent = true; } }, ['handler']).handler;
  const res = await call(handler, { agentId: 'twin__owner', userId: 'owner', text: 'Hello' });
  assert.equal(res.code, 404); assert.equal(spent, false);
});
test('meeting drafts use approved identity and enforce the actual speech limit', async () => {
  let content; let output = 'I need Alex to confirm the date.';
  const module = load('lib/meeting-ai.js', { ...identity, meetingEvents: async () => [], transcriptText: () => 'Meeting context', fetch: async (_, options) => { content = JSON.parse(options.body); return { ok: true, json: async () => ({ content: [{ type: 'text', text: output }] }) }; } }, ['draftMeetingReply']);
  const result = await module.draftMeetingReply({ twinName:'Alex', briefing:'Discuss design' }, { ...twin, persona:'LEGACY_PRIVATE_MEMORY' }, 'Can you attend Friday?');
  assert.equal(result, output); assert.match(content.messages[0].content, /I enjoy chess/); assert.doesNotMatch(content.messages[0].content, /LEGACY_PRIVATE_MEMORY/);
  output = 'x'.repeat(241); await assert.rejects(() => module.draftMeetingReply({twinName:'Alex'}, twin, 'Hello'), /too long/);
});
