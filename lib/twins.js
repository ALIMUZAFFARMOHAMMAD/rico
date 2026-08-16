// AI Twins — the app learns a user's character and publishes an AI version of them
// to the deck, so others can match with it. Server-side only.
// Twin rows live in `conversations` with key `twin::<ownerUserId>`; the twin object
// is stored in the `traits` jsonb column. Twin agent ids look like `twin__<ownerUserId>`.

import { sb, getRow, upsertRow } from "./db";
import { AGENTS } from "./agents";

// licensed stock voice pool for twins (deterministic pick per owner)
const TWIN_VOICES = [
  "Xb7hH8MSUJpSbSDYk0k2", // Alice
  "iP95p4xoKVk53GoZ742B", // Chris
  "onwK4e9ZLuTAKqWW03F9", // Daniel
  "FGY2WhTYpPnrIDTdsKH5", // Laura
  "N2lVS1w4EtoT3dr4eOWO", // Callum
  "XrExE9yKIg1WjnnlVkGX", // Matilda
];
const HOODIES = [["#ff5e7e","#d94768"],["#8b5cf6","#7146d1"],["#38bdf8","#2698d1"],["#4ade80","#35b863"],["#f59e0b","#d18406"],["#f472b6","#d1559a"]];
const SKINS = [["#e8a96e","#d18f54"],["#c98a52","#a86d3c"],["#f2c089","#d9a468"],["#b97c45","#9a6234"],["#f5cf9b","#ddb277"]];

export const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function twinLook(ownerId) {
  const h = hash(ownerId);
  const [hoodie, hoodieD] = HOODIES[h % HOODIES.length];
  const [skin, skinD] = SKINS[(h >> 3) % SKINS.length];
  return { hoodie, hoodieD, skin, skinD, hair: (h >> 5) % 2 ? "#241a12" : "#42210b", beard: (h >> 7) % 2 === 0 };
}

export const twinVoice = (ownerId) => TWIN_VOICES[hash(ownerId) % TWIN_VOICES.length];

export const twinKey = (ownerId) => `twin::${ownerId}`;
export const twinAgentId = (ownerId) => `twin__${ownerId}`;
export const ownerFromAgentId = (agentId) => (typeof agentId === "string" && agentId.startsWith("twin__")) ? agentId.slice(6) : null;

// Resolve any agent id — catalog agent or community twin — into an agent-like object.
export async function resolveAgent(agentId) {
  if (AGENTS[agentId]) return AGENTS[agentId];
  const owner = ownerFromAgentId(agentId);
  if (!owner) return AGENTS.tony;
  try {
    const row = await getRow(twinKey(owner));
    const t = row?.traits;
    if (t && t.persona) {
      return {
        id: agentId, name: t.name, archetype: "Twin", emoji: "🪞",
        bio: t.tagline, interests: t.interests || [],
        look: t.look || twinLook(owner), voice: t.voice || twinVoice(owner),
        avatar: t.avatar || null,
        persona: t.persona, isTwin: true, voiceCloned: !!t.voiceCloned,
      };
    }
  } catch (e) { console.error("twin resolve error:", e.message); }
  return AGENTS.tony;
}

export async function listTwins(excludeOwner) {
  try {
    const rows = await sb(`/conversations?user_id=like.twin%3A%3A*&select=user_id,traits,updated_at&order=updated_at.desc&limit=24`);
    return (rows || [])
      .filter(r => r.traits && r.traits.persona)
      .map(r => {
        const owner = r.user_id.slice(6);
        return {
          id: twinAgentId(owner), owner, name: r.traits.name, archetype: "Twin", emoji: "🪞",
          bio: r.traits.tagline, interests: r.traits.interests || [],
          look: r.traits.look || twinLook(owner), avatar: r.traits.avatar || null, isTwin: true,
        };
      })
      .filter(t => !excludeOwner || t.owner !== excludeOwner);
  } catch (e) { console.error("listTwins error:", e.message); return []; }
}

export async function saveTwin(ownerId, twin) {
  await upsertRow(twinKey(ownerId), { traits: twin });
}
