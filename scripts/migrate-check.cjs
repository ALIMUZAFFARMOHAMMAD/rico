// Usage: node scripts/migrate-check.cjs  — asserts remapKey + (read-only) dev-Clerk email lookup.
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync("pages/api/migrate.js", "utf8").split("\r\n").join("\n");
const grab = (name) => src.slice(src.indexOf(name), src.indexOf("\n}\n", src.indexOf(name)) + 2).replace(/^export /, "");
const { remapKey, verifiedEmails, findDevUserId } = new Function(`${grab("export function remapKey")}\n${grab("const verifiedEmails")}\n${grab("async function findDevUserId")}; return { remapKey, verifiedEmails, findDevUserId };`)();
const O = "user_OLD123", N = "user_NEW999";
assert.equal(remapKey(O, O, N), N);
assert.equal(remapKey(`${O}::meta`, O, N), `${N}::meta`);
assert.equal(remapKey(`${O}::agent::luna`, O, N), `${N}::agent::luna`);
assert.equal(remapKey(`${O}::notebook`, O, N), `${N}::notebook`);
assert.equal(remapKey(`${O}::course::calculus`, O, N), `${N}::course::calculus`);
assert.equal(remapKey(`twin::${O}`, O, N), `twin::${N}`);
assert.equal(remapKey(`userXOLD123::meta`, O, N), null);   // LIKE-wildcard lookalike
assert.equal(remapKey(`${O}X::meta`, O, N), null);         // prefix lookalike
console.log("remapKey ok");
const key = (fs.readFileSync(".env.local", "utf8").match(/^CLERK_SECRET_KEY=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, "");
if (!key) return console.log("no local CLERK_SECRET_KEY — skipping live lookup");
process.env.CLERK_DEV_SECRET_KEY = key;
(async () => {
  const users = await (await fetch("https://api.clerk.com/v1/users?limit=50", { headers: { Authorization: `Bearer ${key}` } })).json();
  const u = users.find(x => verifiedEmails(x.email_addresses, "email_address").length);
  assert.ok(u, "no verified dev user to test with");
  const found = await findDevUserId(verifiedEmails(u.email_addresses, "email_address")[0]);
  assert.equal(found, u.id);
  console.log(`dev lookup ok: ${users.length} dev users, verified-email lookup → …${found.slice(-6)}`);
  assert.equal(await findDevUserId("nobody-" + Date.now() + "@example.invalid"), null);
  console.log("unknown email → null ok");
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
