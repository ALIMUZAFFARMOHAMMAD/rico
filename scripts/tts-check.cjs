// Usage (from repo root, spends ~5 short ElevenLabs TTS calls): node scripts/tts-check.cjs
// Runs the REAL pages/api/tts.js handler; only agent lookup + rate limit are stubbed.
const fs = require("fs"), assert = require("assert");
const env = (k) => (fs.readFileSync(".env.local", "utf8").match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
process.env.ELEVENLABS_API_KEY = env("ELEVENLABS_API_KEY");
process.env.ELEVENLABS_VOICE_ID = env("ELEVENLABS_VOICE_ID");
const twinVoice = () => "pqHfZKP75CvOlQylNhV4"; // any stock voice
const AGENTS = {
  tony: { id: "tony", voice: null },                                                    // founder clone (env)
  twin__u1: { id: "twin__u1", isTwin: true, voice: "sQzcIzIhS3iMbujGqqkr" },            // a real twin clone
  luna: { id: "luna", voice: "pFZP5JQG7iQjIQuC4Bku" },                                  // stock voice
};
const src = fs.readFileSync("pages/api/tts.js", "utf8").replace(/^import .*$/gm, "").replace("export default async function handler", "async function handler");
const handler = new Function("resolveAgent", "twinVoice", "rateLimited", `${src}; return handler;`)(async (id) => AGENTS[id], twinVoice, () => false);
const call = (agentId) => new Promise((done) => {
  const out = { code: 200, headers: {}, bytes: 0 };
  const res = {
    headersSent: false, status(c) { out.code = c; return this; }, json(d) { out.body = d; done(out); }, end() { done(out); },
    setHeader(k, v) { out.headers[k] = v; }, writeHead(c, h) { out.code = c; this.headersSent = true; Object.assign(out.headers, h); },
    write(b) { out.bytes += b.length; },
  };
  handler({ method: "POST", body: { text: "Hey, it's me. Just checking the voice works.", agentId }, headers: {} }, res);
});
(async () => {
  for (const id of Object.keys(AGENTS)) {
    const r = await call(id);
    console.log(`${id.padEnd(9)} ${r.code} ${r.bytes}B audio ${r.headers["X-Voice-Fallback"] ? "(clone rejected → stock fallback)" : ""}${r.body ? JSON.stringify(r.body) : ""}`);
    assert.equal(r.code, 200); assert.ok(r.bytes > 2000, "no audio");
  }
  console.log("ALL TTS CHECKS PASSED");
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
