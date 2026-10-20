const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
function load(relative, names, bindings = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/export default /g, "").replace(/export /g, "");
  const context = { module: { exports: {} }, console: { error() {} }, Buffer, Blob, FormData, AbortSignal, ...bindings };
  vm.runInNewContext(source + `\nmodule.exports = {${names.join(",")}}`, context);
  return context.module.exports;
}
const { createVoiceInput, checkMicrophone } = load("lib/voice-input.js", ["createVoiceInput", "checkMicrophone"]);
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const state = { now: 0, rms: 0, stops: 0, requests: [], timers: new Map(), errors: [], texts: [], statuses: [] };
  let next = 0;
  const stream = { getTracks: () => [{ stop: () => state.stops++ }] };
  const env = {
    Date: { now: () => state.now }, Blob, AbortController,
    setInterval(fn) { const id = ++next; state.timers.set(id, { fn, repeat: true }); return id; },
    clearInterval(id) { state.timers.delete(id); },
    setTimeout(fn, ms) { const id = ++next; state.timers.set(id, { fn, at: state.now + ms }); return id; },
    clearTimeout(id) { state.timers.delete(id); },
    navigator: { mediaDevices: { getUserMedia: async () => stream } },
    MediaRecorder: class {
      static isTypeSupported(type) { return type === "audio/mp4"; }
      constructor() { this.state = "inactive"; this.mimeType = "audio/mp4"; state.recorder = this; }
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["x".repeat(3000)]) }); this.onstop?.(); }
    },
    AudioContext: class {
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
      createMediaStreamSource() { return { connect() {} }; }
      createAnalyser() { return { fftSize: 2048, getFloatTimeDomainData(data) { data.fill(state.rms); } }; }
    },
    FileReader: class {
      readAsDataURL() { this.result = "data:audio/mp4;base64," + Buffer.alloc(3000).toString("base64"); this.onload(); }
    },
    async fetch(url, options) { state.requests.push({ url, ...options }); return { ok: true, json: async () => ({ text: "Please help me plan my day." }) }; },
  };
  const options = { language: "en-US", preferServer: true, onError: message => state.errors.push(message), onText: text => state.texts.push(text), onStatus: status => state.statuses.push(status) };
  const input = createVoiceInput(options, env);
  async function advance(ms, rms = 0) {
    state.rms = rms;
    for (let i = 0; i < ms; i += 100) {
      state.now += 100;
      for (const [id, timer] of [...state.timers]) if (state.timers.has(id) && (timer.repeat || timer.at <= state.now)) {
        if (!timer.repeat) state.timers.delete(id);
        timer.fn();
      }
      await flush();
    }
  }
  return { state, env, input, options, advance, stream };
}
test("recorded microphone turns transcribe once, preserve MIME and release the device", async () => {
  const { input, state, advance } = setup();
  input.start(); await flush();
  await advance(500, 0.08); await advance(1600);
  assert.deepEqual(state.texts, ["Please help me plan my day."]);
  assert.equal(state.requests.length, 1);
  assert.equal(JSON.parse(state.requests[0].body).mime, "audio/mp4");
  assert.equal(JSON.parse(state.requests[0].body).language, "en");
  assert.equal(state.stops, 1);
  assert.equal(state.timers.size, 0);
});
test("silence stops with recovery instructions without uploading noise", async () => {
  const { input, state, advance } = setup();
  input.start(); await flush(); await advance(10100);
  assert.match(state.errors[0], /No speech/);
  assert.equal(state.requests.length, 0); assert.equal(state.stops, 1);
});
test("muting cancels captured audio without sending a turn", async () => {
  const { input, state, advance } = setup();
  input.start(); await flush(); await advance(400, 0.1); input.cancel(); await flush();
  assert.equal(state.requests.length, 0); assert.equal(state.texts.length, 0);
  assert.equal(state.stops, 1); assert.equal(state.timers.size, 0);
});
test("hanging up while permission is pending closes the late stream", async () => {
  const { env, options, state, stream } = setup();
  let grant;
  env.navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { grant = resolve; });
  const input = createVoiceInput(options, env);
  input.start(); input.cancel(); grant(stream); await flush();
  assert.equal(state.stops, 1); assert.equal(state.requests.length, 0);
  assert.equal(state.recorder, undefined);
});
test("a cancelled transcription response cannot start another conversation turn", async () => {
  const { input, env, state, advance } = setup();
  let respond, signal;
  env.fetch = (_, options) => { signal = options.signal; return new Promise(resolve => { respond = resolve; }); };
  input.start(); await flush(); await advance(400, 0.1); input.finish(); await flush();
  input.cancel(); respond({ ok: true, json: async () => ({ text: "Ignore this late reply" }) }); await flush();
  assert.equal(signal.aborted, true); assert.equal(state.texts.length, 0);
});
test("permission denial is explicit and does not retry forever", async () => {
  const { env, options, state } = setup();
  env.navigator.mediaDevices.getUserMedia = async () => { throw Object.assign(new Error(), { name: "NotAllowedError" }); };
  createVoiceInput(options, env).start(); await flush();
  assert.match(state.errors[0], /access is blocked/); assert.equal(state.timers.size, 0);
  await assert.rejects(checkMicrophone(env), /access is blocked/);
});
test("browser recognition network failure falls back to recording", async () => {
  const { env, options, state, advance } = setup();
  let aborted = 0;
  env.SpeechRecognition = class { start() { this.onerror({ error: "network" }); } abort() { aborted++; } };
  createVoiceInput({ ...options, preferServer: false }, env).start(); await flush();
  await advance(400, 0.1); await advance(1600);
  assert.equal(aborted, 1); assert.equal(state.texts.length, 1);
});
test("a browser that never produces recognition events does not remain stuck listening", async () => {
  const { env, options, state, advance } = setup();
  env.SpeechRecognition = class { start() {} abort() {} };
  const input = createVoiceInput({ ...options, preferServer: false }, env);
  input.start(); await advance(12100);
  assert.equal(state.recorder.state, "recording"); input.cancel();
});
test("provider failures are displayed, not treated as silence and retried", async () => {
  const { input, env, state, advance } = setup();
  env.fetch = async () => ({ ok: false, json: async () => ({ error: "Speech service unavailable" }) });
  input.start(); await flush(); await advance(300, 0.1); input.finish(); await flush();
  assert.deepEqual(state.errors, ["Speech service unavailable"]);
  assert.equal(state.texts.length, 0); assert.equal(state.timers.size, 0);
});
function response() { return { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, end() {} }; }
function api(bindings = {}) {
  return load("pages/api/stt.js", ["handler"], {
    getAuth: () => ({ userId: "owner" }), rateLimited: () => false,
    process: { env: { ELEVENLABS_API_KEY: "test" } }, ...bindings,
  }).handler;
}
const body = { audio: Buffer.alloc(3000).toString("base64"), mime: "audio/mp4", language: "en" };
test("transcription rejects unauthenticated callers before provider work", async () => {
  const res = response();
  await api({ getAuth: () => ({}) })({ method: "POST", body }, res);
  assert.equal(res.code, 401);
});
test("transcription validates audio, MIME, language and size", async () => {
  for (const patch of [{ audio: {} }, { audio: "not base64!" }, { mime: "text/html" }, { language: "../en" }, { audio: "A".repeat(5600001) }]) {
    const res = response(); await api()({ method: "POST", body: { ...body, ...patch } }, res);
    assert.equal(res.code, 400);
  }
});
test("transcription uses a matching file extension, a deadline, and plain text", async () => {
  let request;
  const res = response();
  await api({ fetch: async (_, options) => { request = options; return { ok: true, json: async () => ({ text: "  Heard you  " }) }; } })({ method: "POST", body }, res);
  assert.equal(request.body.get("file").name, "turn.m4a");
  assert.equal(request.body.get("tag_audio_events"), "false");
  assert.ok(request.signal instanceof AbortSignal);
  assert.equal(res.body.text, "Heard you");
});
test("upstream quota errors produce an actionable response", async () => {
  const res = response();
  await api({ fetch: async () => ({ ok: false, status: 429 }) })({ method: "POST", body }, res);
  assert.equal(res.code, 429); assert.match(res.body.error, /usage limit/);
});
