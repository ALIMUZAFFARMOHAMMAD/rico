// Memory Vault — see and control what every agent remembers about you. (AGENTCONNECT-SPEC §2)
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useUser, SignInButton } from "@clerk/nextjs";
import { getAgent } from "../lib/agents";
import TonyCharacter from "../components/TonyCharacter";

const C = { bg: "#0f0e17", card: "#1a1826", card2: "#1d1a30", line: "rgba(255,255,255,0.09)", text: "#f5f3ff", sub: "#a9a5c0", cta: "#d6365e", violet: "#a78bfa", red: "#f87171" };
const font = "'DM Sans',system-ui,-apple-system,sans-serif";
const TRAITS = [["O", "Openness", "#7c4fcd"], ["C", "Drive", "#4ade80"], ["E", "Social", "#f59e0b"], ["A", "Empathy", "#38bdf8"], ["N", "Reflection", "#f87171"]];

export default function MemoryVault() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [agents, setAgents] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`/api/memory?userId=${user.id}`);
      const d = await r.json();
      setAgents(d.agents || []);
    } catch (e) { setAgents([]); }
  }, [user]);

  useEffect(() => { if (isLoaded && isSignedIn) load(); }, [isLoaded, isSignedIn, load]);

  async function forgetAgent(agentId) {
    setConfirming(null);
    await fetch("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "forgetAgent", userId: user.id, agentId }) });
    load();
  }
  async function deleteNote(agentId, index) {
    await fetch("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteNote", userId: user.id, agentId, index }) });
    load();
  }

  function downloadEverything() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: user.primaryEmailAddress?.emailAddress || user.id,
      friends: (agents || []).map(a => ({
        friend: getAgent(a.agentId)?.name || a.agentId,
        messagesExchanged: a.msgCount,
        lastTalked: a.updatedAt || null,
        traits: a.traits || {},
        whatTheyRememberFromCalls: a.voiceNotes || [],
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rico-memory-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (<>
    <Head>
      <title>ricomates</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <meta name="theme-color" content="#0f0e17" />
    </Head>
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 560, padding: "0 18px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0", borderBottom: `1px solid ${C.line}`, marginBottom: 18 }}>
          <a href="/" aria-label="Back to chats" style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: C.text }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </a>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Memory Vault</h1>
            <div style={{ color: C.sub, fontSize: 12.5 }}>What your friends remember — in your hands</div>
          </div>
          <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: "50%", border: "2px dashed rgba(167,139,250,0.6)", animation: "rm-orbit 12s linear infinite", position: "relative" }}>
            <span style={{ position: "absolute", width: 9, height: 9, borderRadius: "50%", background: "#ff5e7e", top: -4, left: 14 }} />
          </span>
        </div>

        <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
          Delete a single note, or make a friend forget you completely — no questions asked.
        </p>

        {isSignedIn && agents && agents.length > 0 && (
          <button onClick={downloadEverything} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 48, background: C.card2, color: C.text, border: "1px solid rgba(167,139,250,0.35)", borderRadius: 16, fontFamily: font, fontWeight: 700, fontSize: 14.5, cursor: "pointer", marginBottom: 18 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.violet} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
            Download everything ricomates remembers
          </button>
        )}

        {!isLoaded ? null : !isSignedIn ? (
          <div style={{ textAlign: "center", padding: "40px 10px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>Sign in to see your vault</h2>
            <SignInButton mode="modal"><button style={{ background: C.cta, color: "#fff", border: "none", height: 48, padding: "0 28px", borderRadius: 100, fontFamily: font, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Sign in</button></SignInButton>
          </div>
        ) : agents === null ? (
          <div style={{ textAlign: "center", color: C.sub, padding: 24 }}>Opening the vault…</div>
        ) : agents.length === 0 ? (
          <div style={{ textAlign: "center", color: C.sub, padding: 24 }}>No memories yet — go make some friends!</div>
        ) : agents.map((a, idx) => {
          const ag = getAgent(a.agentId);
          return (
            <div key={a.agentId} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 22, padding: 16, marginBottom: 14, animation: `rm-chip .45s ease-out ${Math.min(idx, 8) * 0.06}s both` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #5b3fd6", background: "#262338", overflow: "hidden", display: "flex", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ marginTop: 3 }}><TonyCharacter size={92} look={ag.look} float="none" animated={false} pose="down" /></div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rm-display" style={{ fontSize: 19, fontWeight: 800 }}>{ag.name}</div>
                  <div style={{ fontSize: 12, color: C.sub }}>{a.msgCount} messages · last talked {a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : "—"}</div>
                </div>
                {confirming === a.agentId ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => forgetAgent(a.agentId)} style={{ background: "#b91c1c", color: "#fff", border: "none", height: 40, padding: "0 12px", borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Yes, forget</button>
                    <button onClick={() => setConfirming(null)} style={{ background: "transparent", color: C.text, border: `1px solid ${C.line}`, height: 40, padding: "0 12px", borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Keep</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirming(a.agentId)} style={{ background: "transparent", color: C.red, border: "1px solid rgba(248,113,113,0.45)", height: 40, padding: "0 12px", borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>Forget me</button>
                )}
              </div>
              {a.traits && a.traits.O > 0 && (
                <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                  {TRAITS.map(([k, label, c]) => (
                    <div key={k} style={{ fontSize: 11.5, fontWeight: 600, color: C.sub }}>{label} <span style={{ color: c, fontWeight: 700 }}>{a.traits[k]}%</span></div>
                  ))}
                </div>
              )}
              {a.voiceNotes.length > 0 && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                  <div style={{ color: "#c4b5fd", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8 }}>WHAT {ag.name.toUpperCase()} REMEMBERS</div>
                  {a.voiceNotes.map((n, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <div style={{ flex: 1, fontSize: 13.5, color: "#e4e0f5", background: C.card2, border: "1px solid rgba(167,139,250,0.25)", borderRadius: 12, padding: "8px 11px", lineHeight: 1.4 }}>{n}</div>
                      <button onClick={() => deleteNote(a.agentId, i)} aria-label="Delete this memory" style={{ width: 40, height: 40, borderRadius: 12, background: "transparent", border: `1px solid ${C.line}`, color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </>);
}
