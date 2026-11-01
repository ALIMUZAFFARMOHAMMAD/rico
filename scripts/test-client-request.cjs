const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function load(fetch) {
  const source = fs.readFileSync(path.join(__dirname, '../lib/client-request.js'), 'utf8').replace(/export /g, '');
  const context = { fetch, AbortController, setTimeout, clearTimeout, SyntaxError, module: { exports: {} } };
  vm.runInNewContext(source + '\nmodule.exports={requestJson,requestTranslation,beginTranslationTurn};', context);
  return context.module.exports;
}
test('interactive requests report API errors instead of empty success', async () => {
  const api = load(async () => ({ ok: false, json: async () => ({ error: 'Service temporarily unavailable' }) }));
  await assert.rejects(api.requestTranslation('Hello', 'en', 'es'), /Service temporarily unavailable/);
});
test('legacy profile errors and unreadable responses are recoverable failures', async () => {
  await assert.rejects(load(async () => ({ ok: true, json: async () => ({ ok: false }) })).requestJson('/api/profile'), /try again/);
  await assert.rejects(load(async () => ({ ok: false, json: async () => { throw new SyntaxError('HTML response'); } })).requestJson('/api/profile'), /unreadable/);
});
test('translation refuses empty or malformed provider results', async () => {
  for (const text of ['', '  ', undefined, 42]) {
    await assert.rejects(load(async () => ({ ok: true, json: async () => ({ text }) })).requestTranslation('Hello', 'en', 'es'), /No translation/);
  }
});
test('translation preserves requested languages and returns usable text', async () => {
  let sent;
  const api = load(async (url, options) => { sent = { url, ...JSON.parse(options.body) }; return { ok: true, json: async () => ({ text: ' Hola ' }) }; });
  assert.equal(await api.requestTranslation('Hello', 'en', 'es'), 'Hola');
  assert.deepEqual(sent, { url: '/api/translate', text: 'Hello', from: 'en', to: 'es' });
});
test('slow requests terminate at their deadline', async () => {
  const api = load((url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))));
  await assert.rejects(api.requestJson('/slow', { timeoutMs: 10 }), /took too long/);
});
test('canceling a screen aborts its in-flight request', async () => {
  const controller = new AbortController();
  const api = load((url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))));
  const request = api.requestJson('/slow', { signal: controller.signal }); controller.abort();
  await assert.rejects(request, /interrupted/);
});
test('microphone starts only after the translated notice finishes', async () => {
  const { beginTranslationTurn } = load(); const events = []; let finish;
  const running = beginTranslationTurn({ needsNotice: true, notice: () => new Promise(resolve => { events.push('notice'); finish = resolve; }), current: () => true, listen: () => events.push('listen') });
  assert.deepEqual(events, ['notice']); finish(); await running;
  assert.deepEqual(events, ['notice', 'listen']);
});
test('reset during the notice cannot restart a microphone', async () => {
  const { beginTranslationTurn } = load(); let finish, current = true, listened = false;
  const running = beginTranslationTurn({ needsNotice: true, notice: () => new Promise(resolve => { finish = resolve; }), current: () => current, listen: () => { listened = true; } });
  current = false; finish(); await running; assert.equal(listened, false);
});
test('failed notice does not open the microphone', async () => {
  let listened = false;
  await load().beginTranslationTurn({ needsNotice: true, notice: async () => false, current: () => true, listen: () => { listened = true; } });
  assert.equal(listened, false);
});
