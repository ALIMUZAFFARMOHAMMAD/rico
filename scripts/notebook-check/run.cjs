// Usage (from repo root, spends ~4 Claude calls): node scripts/notebook-check/run.cjs
// Runs the REAL pages/api/notebook.js handler with db/auth/ratelimit stubbed in memory.
const fs = require("fs"), path = require("path"), assert = require("assert");
const env = fs.readFileSync(".env.local", "utf8").match(/^ANTHROPIC_API_KEY=(.*)$/m);
process.env.ANTHROPIC_API_KEY = env[1].trim().replace(/^["']|["']$/g, "");
let src = fs.readFileSync("pages/api/notebook.js", "utf8")
  .replace(/^import .*$/gm, "")
  .replace("export const config", "const config")
  .replace("export default async function handler", "async function handler");
let row = null;
const stubs = `const configured=()=>true, notebookKey=u=>u+"::notebook", ownsUser=()=>true, rateLimited=()=>false;
  const getRow=async()=>row, upsertRow=async(k,f)=>{row={...(row||{}),...f};};`;
const handler = new Function("row_", `let row=row_; ${stubs} ${src}; return {handler, peek:()=>row};`)(null);
const call = (body) => new Promise((resolve) => {
  const res = { code: 200, status(c) { this.code = c; return this; }, json(d) { resolve({ code: this.code, d }); }, end() { resolve({ code: this.code }); } };
  handler.handler({ method: "POST", body: { userId: "u_test", ...body }, headers: {} }, res);
});
const jpg = (f) => "data:image/jpeg;base64," + fs.readFileSync(path.join(__dirname, f)).toString("base64");
(async () => {
  let t = Date.now(), r = await call({ mode: "calibrate", image: jpg("calib.jpg") });
  console.log(`CALIBRATE ${r.code} (${((Date.now()-t)/1000).toFixed(1)}s)\n readback:\n${r.d.handwriting?.readback}\n profile: ${r.d.handwriting?.profile?.slice(0, 400)}\n`);
  assert.equal(r.code, 200); assert.match(r.d.handwriting.readback, /quick brown fox/i);
  t = Date.now(); r = await call({ mode: "add", image: jpg("note.jpg") });
  console.log(`ADD ${r.code} (${((Date.now()-t)/1000).toFixed(1)}s)\n title: ${r.d.added?.title}\n text:\n${r.d.added?.text}\n insight: ${handler.peek().voice_notes?.at(-1)}\n`);
  assert.equal(r.code, 200); assert.equal(r.d.notes.length, 1); assert.match(r.d.added.text, /Oct 14/); assert.match(r.d.added.text, /Ammi/);
  for (const q of ["When is my investor pitch?", "What's my favourite football team?"]) {
    t = Date.now(); r = await call({ mode: "ask", question: q });
    console.log(`ASK "${q}" ${r.code} (${((Date.now()-t)/1000).toFixed(1)}s)\n ${r.d.answer}\n`);
    assert.equal(r.code, 200);
  }
  r = await call({ mode: "delete", id: handler.peek().traits.notes[0].id });
  assert.equal(r.d.notes.length, 0); console.log("DELETE ok\nALL CHECKS PASSED");
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
