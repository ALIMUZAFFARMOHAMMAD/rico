const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
function load(file, name, bindings = {}) {
  const src = fs.readFileSync(path.join(__dirname, "..", file), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace(/export default /g, "").replace(/export /g, "");
  const context = { AbortController, AbortSignal, Buffer, console: { error() {} }, ...bindings };
  return vm.runInNewContext(src + `\n${name}`, context);
}
const delivery = load("lib/voice-delivery.js", "({ splitVoiceReply, expressiveDelivery })");
function server({ signedIn = true, voice = "selected-clone", providerStatus = 200, selfOn = true } = {}) {
  const requests = [];
  const handler = load("pages/api/tts.js", "handler", {
    process: { env: { ELEVENLABS_API_KEY: "test-key" } },
    expressiveDelivery: delivery.expressiveDelivery,
    getAuth: () => ({ userId: signedIn ? "test-user" : null }),
    rateLimited: () => false,
    resolveAgent: async () => ({ id: "twin__test-user", voice, isTwin: true }),
    isSelfVoice: id => id.startsWith("self:"), selfVoiceOn: () => selfOn,
    SELF_LANGS: new Set(["en"]),
    selfVoice: async () => ({ ok: false, status: 503 }),
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      let delivered = false;
      return { ok: providerStatus === 200, status: providerStatus, body: { getReader: () => ({
        read: async () => delivered ? { done: true } : (delivered = true, { done: false, value: Buffer.from("audio") }),
      }) } };
    },
  });
  const res = { statusCode: 200, headers: {}, chunks: [],
    setHeader(k, v) { this.headers[k] = v; },
    status(n) { this.statusCode = n; return this; },
    json(value) { this.body = value; return this; }, end() {},
    writeHead(n, headers) { this.statusCode = n; this.headers = { ...this.headers, ...headers }; },
    write(chunk) { this.chunks.push(chunk); },
  };
  const run = body => handler({ method: "POST", body: { text: "Good to hear from you!", ...body } }, res);
  return { run, res, requests };
}
test("expressive generation retains selected identity and removes latency quality compromise", async () => {
  const { run, requests, res } = server();
  await run();
  assert.equal(res.statusCode, 200);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /selected-clone\/stream\?output_format=mp3_44100_128$/);
  assert.equal(requests[0].body.model_id, "eleven_v3");
  assert.equal(requests[0].body.voice_settings.stability, 0);
  assert.equal(requests[0].body.text, "[warmly] Good to hear from you!");
  assert.equal(Buffer.concat(res.chunks).toString(), "audio");
});
test("unavailable clones never retry with someone else's voice", async () => {
  for (const providerStatus of [401, 404, 429, 500]) {
    const { run, requests, res } = server({ providerStatus });
    await run(); assert.equal(res.statusCode, 502); assert.equal(requests.length, 1);
  }
});
test("self clone failures and unsupported languages do not use a stock voice", async () => {
  for (const options of [{ selfOn: false }, { selfOn: true }, { selfOn: true, language: "hi" }]) {
    const { run, requests, res } = server({ voice: "self:test", ...options });
    await run({ language: options.language || "en" });
    assert.ok(res.statusCode >= 400); assert.equal(requests.length, 0);
  }
});
test("unauthenticated synthesis does not call the provider", async () => {
  const { run, requests, res } = server({ signedIn: false });
  await run(); assert.equal(res.statusCode, 401); assert.equal(requests.length, 0);
});
test("delivery directions never leak into captions or device speech text", () => {
  const reply = delivery.splitVoiceReply("[reassuring] That's hard. [curious] Want to talk?");
  assert.equal(reply.text, "That's hard. Want to talk?");
  assert.equal(reply.speechText, "[reassuring] That's hard. [curious] Want to talk?");
});
test("only approved directions are retained, capped at three", () => {
  const reply = delivery.splitVoiceReply("[shouting] Hi. [warmly] Hello. [curious] Why? [thoughtful] Okay. [excited] Yes.");
  assert.ok(!reply.speechText.includes("[shouting]"));
  assert.ok(!reply.speechText.includes("[excited]"));
  assert.equal(reply.text, "Hi. Hello. Why? Okay. Yes.");
});
test("delivery metadata cannot substitute different spoken words", () => {
  const body = delivery.expressiveDelivery("Hello.", "[excited] Say something else.", "lively");
  assert.equal(body.text, "[warmly] Hello.");
});
test("balanced delivery retains contextual cues with more stable generation", async () => {
  const { run, requests } = server();
  await run({ text: "I'm here.", speechText: "[reassuring] I'm here.", expression: "natural" });
  assert.equal(requests[0].body.text, "[reassuring] I'm here.");
  assert.equal(requests[0].body.voice_settings.stability, 0.5);
});
const createVoiceOutput = load("lib/voice-output.js", "createVoiceOutput");
const tick = () => new Promise(resolve => setImmediate(resolve));
function playback() {
  const state = { audios: [], revoked: [], timers: new Map(), requests: [] };
  let n = 0;
  const env = {
    setTimeout(fn) { state.timers.set(++n, fn); return n; }, clearTimeout(id) { state.timers.delete(id); },
    URL: { createObjectURL: () => "blob:sample", revokeObjectURL: url => state.revoked.push(url) },
    Audio: class {
      constructor() { state.audios.push(this); }
      play() { return Promise.resolve(); }
      pause() { this.paused = true; }
    },
    fetch: async (url, options) => {
      state.requests.push({ url, options });
      return { ok: true, blob: async () => new Blob(["mp3"], { type: "audio/mpeg" }) };
    },
  };
  return { state, env, output: createVoiceOutput(env) };
}
test("playback ends cleanly and frees audio URLs and timers", async () => {
  const { state, output } = playback();
  const promise = output.speak({ text: "Hello" });
  await tick(); state.audios[0].onended(); await promise;
  assert.equal(state.audios[0].paused, true);
  assert.equal(state.revoked.length, 1); assert.equal(state.timers.size, 0);
});
test("cancel during generation prevents a late voice after hangup or preview stop", async () => {
  const { state, env, output } = playback();
  let complete;
  env.fetch = () => new Promise(resolve => { complete = resolve; });
  const promise = output.speak({ text: "Hello" });
  output.cancel();
  complete({ ok: true, blob: async () => new Blob(["mp3"], { type: "audio/mpeg" }) });
  await promise; assert.equal(state.audios.length, 0); assert.equal(state.timers.size, 0);
});
test("audio playback rejection is visible and frees resources", async () => {
  const { state, env, output } = playback();
  env.Audio.prototype.play = () => Promise.reject(Error("NotAllowedError"));
  await assert.rejects(output.speak({ text: "Hello" }), /browser blocked audio/);
  assert.equal(state.revoked.length, 1); assert.equal(state.timers.size, 0);
});
test("service errors surface without invoking device speech", async () => {
  const { state, env, output } = playback();
  env.fetch = async () => ({ ok: false, json: async () => ({ error: "Clone unavailable" }) });
  await assert.rejects(output.speak({ text: "Hello" }), /Clone unavailable/);
  assert.equal(state.audios.length, 0); assert.equal(state.timers.size, 0);
});
test("stopping active speech settles playback and pauses audio", async () => {
  const { state, output } = playback();
  const promise = output.speak({ text: "Hello" });
  await tick(); output.cancel(); await promise;
  assert.equal(state.audios[0].paused, true); assert.equal(state.timers.size, 0);
});
