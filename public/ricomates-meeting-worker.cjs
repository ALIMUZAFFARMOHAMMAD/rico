#!/usr/bin/env node
/* Ricomates PC bridge. No dependencies. Node 20+. Configuration stays on this PC. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const executeFile = promisify(execFile);
// Inspect the pinned local services without a shell or any credential output.
// Cache the checks so model health does not delay every cloud heartbeat.
function createHealthProbe(run = executeFile) {
  const docker = process.platform === 'win32'
    ? ['D:\\RicomatesBot\\Docker\\resources\\bin\\docker.exe', 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe'].find(file => fs.existsSync(file)) || 'docker.exe'
    : 'docker';
  let cached, checkedAt = 0;
  return async () => {
    if (cached && Date.now() - checkedAt < 20000) return cached;
    const check = args => run(docker, args, { windowsHide: true, timeout: 7000, maxBuffer: 16000 });
    const [speech, runtime] = await Promise.allSettled([
      check(['exec', 'ricomates-stt-transcription-api-1', 'wget', '-qO-', 'http://127.0.0.1/health']),
      check(['inspect', 'vexa-v012-runtime-1', '--format', '{{.State.Health.Status}}']),
    ]);
    let speechStatus = 'unavailable';
    try { if (speech.status === 'fulfilled' && JSON.parse(speech.value.stdout).status === 'healthy') speechStatus = 'ready'; } catch { /* Fail closed on malformed health. */ }
    cached = { speechStatus, runtimeStatus: runtime.status === 'fulfilled' && runtime.value.stdout.trim() === 'healthy' ? 'ready' : 'unavailable' };
    checkedAt = Date.now();
    return cached;
  };
}
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
function speechFingerprint(segments) {
  const canonical = segments.filter(s => s.completed === true).sort((a,b) => a.start - b.start).map(s => [s.segment_id, (s.speaker || 'Speaker').slice(0,120), s.text, s.start]);
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
function createWorker(config, dependencies = {}) {
  const request = dependencies.fetch || fetch;
  const state = dependencies.state || { jobs: {}, active: {}, hashes: {} };
  const persist = dependencies.persist || (() => {});
  const now = dependencies.now || Date.now;
  const speechTasks = new Map(), autoTasks = new Map(), activity = new Map(), autoSessions = new Map();
  async function json(url, method, headers, body) {
    const r = await request(url, { method, headers: { ...headers, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(45000), redirect: 'error' });
    if (!r.ok) { const e = new Error(`Request failed (${r.status}).`); e.status = r.status; throw e; }
    if (r.status === 204) return null;
    return r.json();
  }
  const local = (route, method = 'GET', body) => json(config.vexaUrl + route, method, { 'X-API-Key': config.vexaApiKey }, body);
  const cloud = body => json(config.appUrl + '/api/meeting-worker', 'POST', { Authorization: 'Bearer ' + config.pairToken }, body);
  const autoCloud = body => json(config.appUrl + '/api/meeting-auto', 'POST', { Authorization: 'Bearer ' + config.pairToken }, body);
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
        const bot = await local('/bots', 'POST', { platform: platform(job.platform), meeting_url: job.url, bot_name: `${String(job.twinName || 'Ricomates').slice(0, 30)} · AI ${job.voiceEnabled ? 'twin' : 'notes'}`, voice_agent_enabled: job.voiceEnabled === true, recording_enabled: false, transcribe_enabled: true, automatic_leave: { waiting_room_timeout: 600000, everyone_left_timeout: 60000 } });
        if (!Number.isSafeInteger(bot?.id) || bot.id < 1 || bot.platform !== platform(job.platform) || typeof bot.native_meeting_id !== 'string' || !bot.native_meeting_id || /[?#&=/\s]/.test(bot.native_meeting_id)) throw new Error('Invalid bot response; check local Vexa.');
        const m = { id: job.id, platform: job.platform, providerId: bot.id, nativeId: bot.native_meeting_id };
        state.active[job.id] = m;
        result = { ...result, providerId: bot.id, nativeId: bot.native_meeting_id };
      } else if (job.type === 'leave') await stop(job);
      else if (job.type === 'speak' || job.type === 'stop_speaking') {
        if (job.platform !== 'meet' || job.voiceEnabled !== true) throw new Error('Voice is not enabled for this meeting.');
        const current = identity(await local('/meetings/' + job.providerId), job);
        if (current.status !== 'active') throw new Error('The meeting is not active.');
        const route = `/bots/${platform(job.platform)}/${encodeURIComponent(job.nativeId)}/speak`;
        if (job.type === 'stop_speaking') await local(route + '?meeting_id=' + job.providerId, 'DELETE');
        else {
          const audio = await cloud({ action: 'voice', id: job.id, jobId: job.jobId, lease: job.lease });
          if (!['mp3', 'wav'].includes(audio?.format) || typeof audio.audio_base64 !== 'string' || audio.audio_base64.length > 1400000) throw new Error('Invalid cloned audio.');
          // The meeting may have ended while the voice provider was working.
          const fresh = identity(await local('/meetings/' + job.providerId), job);
          if (fresh.status !== 'active') throw new Error('Meeting ended before playback.');
          if (job.automatic) {
            const transcript = identity(await local('/transcripts/by-id/' + job.providerId), job);
            if (!Array.isArray(transcript.segments) || transcript.segments.some(s => s.completed !== true) || speechFingerprint(transcript.segments) !== job.autoFingerprint) throw new Error('Conversation changed before playback.');
            const permission = await autoCloud({ action: 'authorize', id: job.id, jobId: job.jobId, lease: job.lease });
            if (permission?.allowed !== true || autoSessions.get(job.id)?.stopId) throw new Error('Automatic replies paused.');
          }
          await local(route, 'POST', { ...audio, meeting_id: job.providerId });
        }
      }
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
      if (speechTasks.has(id)) continue;
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
    let voiceVersion = 0;
    if (ready) {
      try { const capabilities = await local('/bots/ricomates/voice-capabilities'); if (capabilities?.version === 1 && capabilities.platforms?.includes('google_meet')) voiceVersion = 1; } catch { /* Old Vexa still supports notes. */ }
    }
    const health = dependencies.health ? await dependencies.health() : { speechStatus: 'unknown', runtimeStatus: 'unknown' };
    const data = await cloud({ action: 'poll', ready, voiceVersion, autoVersion: 1, ...health });
    if (!ready) return { ready: false };
    for (const m of data.meetings || []) {
      autoSessions.set(m.id, m.auto);
      if (m.auto?.stopId && m.platform === 'meet') {
        try {
          const current = identity(await local('/meetings/' + m.providerId), m);
          if (current.status === 'active') await local(`/bots/google_meet/${encodeURIComponent(m.nativeId)}/speak?meeting_id=${m.providerId}`, 'DELETE');
          // Repeat stop until an in-flight send has settled, then acknowledge.
          if (![...speechTasks.keys()].some(id => state.jobs[id]?.job?.id === m.id)) await autoCloud({ action: 'stopped', id: m.id, stopId: m.auto.stopId });
        } catch { /* Retry the stop on the next heartbeat. */ }
      }
    }
    for (const job of data.jobs || []) {
      if (job.type === 'speak') {
        if (!speechTasks.has(job.jobId)) {
          const task = execute(job).catch(() => {}).finally(() => speechTasks.delete(job.jobId));
          speechTasks.set(job.jobId, task);
        }
      } else { await execute(job); await flush(); }
    }
    for (const m of data.meetings || []) {
      state.active[m.id] = m; persist(state);
      try {
        const record = identity(await local('/transcripts/by-id/' + m.providerId), m);
        if (!Array.isArray(record.segments)) continue;
        const segments = record.segments.filter(s => s.completed === true);
        const snapshot = { action: 'snapshot', id: m.id, providerId: m.providerId, nativeId: m.nativeId, platform: platform(m.platform), status: record.status, segments };
        const hash = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
        if (hash !== state.hashes[m.id]) { await cloud(snapshot); state.hashes[m.id] = hash; }
        const heardHash = crypto.createHash('sha256').update(JSON.stringify(record.segments.map(s => [s.segment_id, s.text, s.completed]))).digest('hex');
        const previous = activity.get(m.id);
        if (!previous || previous.hash !== heardHash || previous.generation !== m.auto?.generation) activity.set(m.id, { hash: heardHash, since: now(), generation: m.auto?.generation, observedChange: !!previous && previous.hash !== heardHash });
        const quiet = activity.get(m.id);
        if (m.auto?.enabled && record.status === 'active' && quiet.observedChange && now() - quiet.since >= 6000 && !record.segments.some(s => s.completed !== true) && !autoTasks.has(m.id)) {
          const fingerprint = speechFingerprint(segments);
          // Generation must not block heartbeats, pause requests or transcription.
          const task = autoCloud({ action: 'turn', id: m.id, fingerprint, quietSince: quiet.since }).then(() => { quiet.observedChange = false; }).catch(() => { quiet.observedChange = false; }).finally(() => autoTasks.delete(m.id));
          autoTasks.set(m.id, task);
        }
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
  return { tick, execute, flush, stopAll, state, drain: () => Promise.all([...speechTasks.values(), ...autoTasks.values()]) };
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
  const worker = createWorker(config, { state, health: createHealthProbe(), persist(value) { fs.writeFileSync(statePath + '.tmp', JSON.stringify(value), { mode: 0o600 }); fs.renameSync(statePath + '.tmp', statePath); }, warn: text => console.warn(text) });
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
    if (running) await new Promise(resolve => setTimeout(resolve, 3000));
  }
  await worker.stopAll();
}
module.exports = { createWorker, createHealthProbe, validateConfig, validateMeetingLink, identity };
if (require.main === module) main().catch(() => { console.error('Worker could not start. Check the config file. If a .lock file exists, confirm the previous worker has stopped before removing it.'); process.exitCode = 1; });
