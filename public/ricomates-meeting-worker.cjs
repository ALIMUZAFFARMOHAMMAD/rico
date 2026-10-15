#!/usr/bin/env node
/* Ricomates PC bridge. No dependencies. Node 20+. Configuration stays on this PC. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const terminal = s => ['completed', 'failed'].includes(s);
const platform = p => p === 'meet' ? 'google_meet' : p;
function validateConfig(c) {
  const app = new URL(c.appUrl), vexa = new URL(c.vexaUrl);
  if (app.origin !== 'https://ricomates.si' || app.username || app.password || app.pathname !== '/') throw new Error('appUrl must be https://ricomates.si');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(vexa.hostname) || !['http:', 'https:'].includes(vexa.protocol) || vexa.username || vexa.password || vexa.pathname !== '/') throw new Error('Vexa must be a loopback URL on this PC.');
  if (typeof c.pairToken !== 'string' || !/^[\w-]+\.[a-f0-9]{64}$/.test(c.pairToken) || typeof c.vexaApiKey !== 'string' || !c.vexaApiKey.trim()) throw new Error('Add the PC pairing token and local Vexa API key to the config file.');
  return { ...c, appUrl: app.origin, vexaUrl: vexa.origin };
}
function validateMeetingLink(value, p) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.port) throw new Error('Invalid meeting URL.');
  const ok = p === 'meet' ? u.hostname === 'meet.google.com' && /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(u.pathname) : p === 'zoom' ? (u.hostname === 'zoom.us' || u.hostname.endsWith('.zoom.us')) && /^\/(j|my)\/.+/.test(u.pathname) : p === 'teams' && ['teams.microsoft.com', 'teams.live.com', 'teams.cloud.microsoft'].includes(u.hostname) && /^\/(l\/meetup-join|meet)\/.+/.test(u.pathname);
  if (!ok) throw new Error('Unsupported meeting URL.');
  return u.toString();
}
function identity(record, m) {
  if (record?.id !== m.providerId || record.platform !== platform(m.platform) || record.native_meeting_id !== m.nativeId) throw new Error('Local meeting identity changed; refusing to act on another session.');
  return record;
}
function createWorker(config, dependencies = {}) {
  const request = dependencies.fetch || fetch;
  const state = dependencies.state || { jobs: {}, active: {}, hashes: {} };
  const persist = dependencies.persist || (() => {});
  async function json(url, method, headers, body) {
    const r = await request(url, { method, headers: { ...headers, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(45000), redirect: 'error' });
    if (!r.ok) { const e = new Error(`Request failed (${r.status}).`); e.status = r.status; throw e; }
    if (r.status === 204) return null;
    return r.json();
  }
  const local = (route, method = 'GET', body) => json(config.vexaUrl + route, method, { 'X-API-Key': config.vexaApiKey }, body);
  const cloud = body => json(config.appUrl + '/api/meeting-worker', 'POST', { Authorization: 'Bearer ' + config.pairToken }, body);
  async function stop(m) {
    const current = identity(await local('/meetings/' + m.providerId), m);
    if (!terminal(current.status)) await local(`/bots/${platform(m.platform)}/${encodeURIComponent(m.nativeId)}`, 'DELETE');
  }
  async function execute(job) {
    const previous = state.jobs[job.jobId];
    if (previous) return; // Started-before-crash is uncertain, never replayed.
    state.jobs[job.jobId] = { job, result: { action: 'result', id: job.id, jobId: job.jobId, lease: job.lease, ok: false } };
    persist(state); // Journal BEFORE the external side effect.
    try {
      let result = { ...state.jobs[job.jobId].result, ok: true };
      if (job.type === 'join') {
        validateMeetingLink(job.url, job.platform);
        const bot = await local('/bots', 'POST', { platform: platform(job.platform), meeting_url: job.url, bot_name: `${String(job.twinName || 'Ricomates').slice(0, 30)} · AI notes`, recording_enabled: false, transcribe_enabled: true, automatic_leave: { waiting_room_timeout: 600000, everyone_left_timeout: 60000 } });
        if (!Number.isSafeInteger(bot?.id) || bot.id < 1 || bot.platform !== platform(job.platform) || typeof bot.native_meeting_id !== 'string' || !bot.native_meeting_id || /[?#&=/\s]/.test(bot.native_meeting_id)) throw new Error('Invalid bot response; check local Vexa.');
        const m = { id: job.id, platform: job.platform, providerId: bot.id, nativeId: bot.native_meeting_id };
        state.active[job.id] = m;
        result = { ...result, providerId: bot.id, nativeId: bot.native_meeting_id };
      } else if (job.type === 'leave') await stop(job);
      else if (job.type === 'purge') {
        const current = identity(await local('/meetings/' + job.providerId), job);
        if (!terminal(current.status)) throw new Error('Finish the meeting before deleting its data.');
        await local('/meetings/' + job.providerId, 'DELETE');
        delete state.active[job.id]; delete state.hashes[job.id];
      } else throw new Error('Unsupported PC action.');
      state.jobs[job.jobId].result = result;
    } catch { /* Ambiguous joins are reported, never automatically retried. */ }
    persist(state);
  }
  async function flush() {
    for (const [id, entry] of Object.entries(state.jobs)) {
      if (entry.acknowledged) continue;
      try { await cloud(entry.result); }
      catch (e) { if (![404, 409].includes(e.status)) throw e; }
      entry.acknowledged = true;
      // Keep the job ID for idempotency, remove the meeting URL/passcode.
      delete entry.job;
      persist(state);
    }
  }
  async function tick() {
    await flush();
    let ready = false;
    try { const me = await local('/auth/me'); ready = Array.isArray(me?.scopes) && me.scopes.includes('bot') && me.scopes.includes('tx'); } catch { /* Report offline without claiming jobs. */ }
    const data = await cloud({ action: 'poll', ready });
    if (!ready) return { ready: false };
    for (const job of data.jobs || []) { await execute(job); await flush(); }
    for (const m of data.meetings || []) {
      state.active[m.id] = m; persist(state);
      try {
        const record = identity(await local('/transcripts/by-id/' + m.providerId), m);
        if (!Array.isArray(record.segments)) continue;
        const segments = record.segments.filter(s => s.completed === true);
        const snapshot = { action: 'snapshot', id: m.id, providerId: m.providerId, nativeId: m.nativeId, platform: platform(m.platform), status: record.status, segments };
        const hash = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
        if (hash !== state.hashes[m.id]) { await cloud(snapshot); state.hashes[m.id] = hash; }
        if (terminal(record.status)) delete state.active[m.id];
        persist(state);
      } catch (e) {
        if (e.status === 401) throw e;
        if (dependencies.warn) dependencies.warn('A transcript could not sync. Check the app and local Vexa dashboard.');
      }
    }
    return { ready: true };
  }
  async function stopAll() { for (const m of Object.values(state.active)) { try { await stop(m); } catch { /* Owner may need to stop an unreachable bot in Vexa. */ } } }
  return { tick, execute, flush, stopAll, state };
}
async function main() {
  const configPath = path.resolve(process.argv[2] || 'ricomates-pc.json');
  const config = validateConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')));
  const statePath = configPath + '.state.json', lockPath = configPath + '.lock';
  // A second process must not run from the same installation.
  const lock = fs.openSync(lockPath, 'wx', 0o600); fs.writeSync(lock, String(process.pid));
  const cleanup = () => { try { fs.closeSync(lock); fs.unlinkSync(lockPath); } catch {} };
  process.on('exit', cleanup);
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { jobs: {}, active: {}, hashes: {} };
  const worker = createWorker(config, { state, persist(value) { fs.writeFileSync(statePath + '.tmp', JSON.stringify(value), { mode: 0o600 }); fs.renameSync(statePath + '.tmp', statePath); }, warn: text => console.warn(text) });
  let running = true, lastStatus;
  process.on('SIGINT', () => { running = false; });
  process.on('SIGTERM', () => { running = false; });
  console.log('Ricomates PC worker started. Keep this window open and the PC awake. Ctrl+C leaves tracked meetings.');
  while (running) {
    try {
      const result = await worker.tick();
      const status = result.ready ? 'PC connected. Waiting for meeting requests from Ricomates.' : 'Local Vexa is unavailable or the key lacks bot + tx scopes. Check setup.';
      if (status !== lastStatus) { console.log(status); lastStatus = status; }
    } catch (e) {
      if (e.status === 401) { console.error('Pairing expired or disconnected. Leaving tracked meetings.'); running = false; }
      else console.warn('Connection interrupted. Retrying updates; joins will not be repeated.');
    }
    if (running) await new Promise(resolve => setTimeout(resolve, 10000));
  }
  await worker.stopAll();
}
module.exports = { createWorker, validateConfig, validateMeetingLink, identity };
if (require.main === module) main().catch(() => { console.error('Worker could not start. Check the config file. If a .lock file exists, confirm the previous worker has stopped before removing it.'); process.exitCode = 1; });
