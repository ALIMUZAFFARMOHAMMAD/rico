// Server-side Supabase REST helper + Phase-1 key scheme.
//
// ZERO-DDL NAMESPACING: we cannot run DDL from this environment, so per-agent
// memory and per-user meta live in the existing `conversations` table using
// composite user_id keys:
//   - Tony memory:        "<userId>"                    (unchanged — preserves all existing data)
//   - Other agent memory: "<userId>::agent::<agentId>"
//   - User meta row:      "<userId>::meta"              (messages column = matches array,
//                                                        voice_notes column = reports array)
// Proper tables for Phase 2 are in supabase-phase1.sql — run in the SQL editor when ready.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const configured = () => !!(SUPABASE_URL && SUPABASE_KEY);

export async function sb(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "return=minimal",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, opts);
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const memKey = (userId, agentId) =>
  !agentId || agentId === "tony" ? userId : `${userId}::agent::${agentId}`;

export const metaKey = (userId) => `${userId}::meta`;

export async function getRow(key) {
  const d = await sb(`/conversations?user_id=eq.${encodeURIComponent(key)}&select=*&order=updated_at.desc&limit=1`);
  return d && d[0] ? d[0] : null;
}

export async function upsertRow(key, fields) {
  const existing = await sb(`/conversations?user_id=eq.${encodeURIComponent(key)}&select=id&limit=1`);
  if (existing && existing.length > 0) {
    await sb(`/conversations?user_id=eq.${encodeURIComponent(key)}`, "PATCH", { ...fields, updated_at: new Date().toISOString() });
  } else {
    await sb("/conversations", "POST", { user_id: key, messages: [], traits: {}, riasec: "", msg_count: 0, voice_notes: [], ...fields });
  }
}

export async function deleteRow(key) {
  await sb(`/conversations?user_id=eq.${encodeURIComponent(key)}`, "DELETE");
}

// All memory rows belonging to a user (tony row + agent rows + meta row)
export async function getUserRows(userId) {
  const enc = encodeURIComponent(userId);
  const [plain, namespaced] = await Promise.all([
    sb(`/conversations?user_id=eq.${enc}&select=*`),
    sb(`/conversations?user_id=like.${enc}::*&select=*`),
  ]);
  return [...(plain || []), ...(namespaced || [])];
}

export function parseKey(user_id) {
  // returns { userId, kind: "agent"|"meta"|"tony", agentId }
  const m = user_id.match(/^(.*?)::(agent|meta)(?:::(.+))?$/);
  if (!m) return { userId: user_id, kind: "tony", agentId: "tony" };
  if (m[2] === "meta") return { userId: m[1], kind: "meta", agentId: null };
  return { userId: m[1], kind: "agent", agentId: m[3] };
}
