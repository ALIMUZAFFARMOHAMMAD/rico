// Memory Vault — see and control what every agent remembers about you. (AGENTCONNECT-SPEC §2)
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useUser, SignInButton } from "@clerk/nextjs";
import { getAgent } from "../lib/agents";
import TonyCharacter from "../components/TonyCharacter";

const INK = "#1a1008";
const YELLOW = "#ffe566";
const RED = "#e63946";
const PURPLE = "#7c4fcd";
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

  return (<>
    <Head>
      <title>Memory Vault — hitony.ai</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
    </Head>
    <div style={{ minHeight: "calc(100vh - 36px)", maxWidth: 560, margin: "18px auto", border: "none", borderRadius: 26, boxShadow: "0 24px 70px rgba(60,40,20,0.35)", background: "#fdf8f0", fontFamily: "'Comic Neue',cursive", overflow: "hidden", backgroundImage: "linear-gradient(rgba(26,16,8,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(26,16,8,0.05) 1px,transparent 1px)", backgroundSize: "28px 28px" }}>
      <div style={{ background: YELLOW, borderBottom: `4px solid ${INK}`, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: `0 4px 0 ${INK}` }}>
        <a href="/" style={{ background: "white", border: `3px solid ${INK}`, padding: "4px 10px", fontFamily: "Bangers,cursive", fontSize: 15, textDecoration: "none", color: INK, boxShadow: `3px 3px 0 ${INK}` }}>← CHAT</a>
        <div style={{ fontFamily: "Bangers,cursive", fontSize: 22, color: INK, letterSpacing: 2 }}>🧠 MEMORY VAULT</div>
        <div style={{ width: 64 }} />
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#777", marginBottom: 14, lineHeight: 1.5 }}>
          Everything your friends remember about you, in your hands. Delete a single note, or make an agent forget you completely — no questions asked.
        </div>

        {!isLoaded ? null : !isSignedIn ? (
          <div style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontFamily: "Bangers,cursive", fontSize: 20, color: PURPLE, marginBottom: 10 }}>SIGN IN TO SEE YOUR VAULT</div>
            <SignInButton mode="modal"><button style={{ background: PURPLE, color: "white", border: `3px solid ${INK}`, padding: "10px 20px", fontFamily: "Bangers,cursive", fontSize: 16, cursor: "pointer", boxShadow: `4px 4px 0 ${INK}` }}>SIGN IN</button></SignInButton>
          </div>
        ) : agents === null ? (
          <div style={{ fontFamily: "Bangers,cursive", textAlign: "center", color: "#aaa", padding: 20 }}>OPENING THE VAULT...</div>
        ) : agents.length === 0 ? (
          <div style={{ fontFamily: "Bangers,cursive", textAlign: "center", color: "#aaa", padding: 20 }}>NO MEMORIES YET — GO MAKE SOME FRIENDS!</div>
        ) : agents.map(a => {
          const ag = getAgent(a.agentId);
          return (
            <div key={a.agentId} style={{ border: `3px solid ${INK}`, background: "white", boxShadow: `5px 5px 0 ${INK}`, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid ${PURPLE}`, background: "#fff9e6", overflow: "hidden", display: "flex", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ marginTop: 3 }}><TonyCharacter size={92} look={ag.look} float="none" animated={false} pose="down" /></div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Bangers,cursive", fontSize: 19, color: INK, letterSpacing: 1 }}>{ag.emoji} {ag.name.toUpperCase()}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>{a.msgCount} messages · last talked {a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : "—"}</div>
                </div>
                {confirming === a.agentId ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => forgetAgent(a.agentId)} style={{ background: RED, color: "white", border: `2px solid ${INK}`, padding: "5px 10px", fontFamily: "Bangers,cursive", fontSize: 12, cursor: "pointer", boxShadow: `2px 2px 0 ${INK}` }}>YES, FORGET</button>
                    <button onClick={() => setConfirming(null)} style={{ background: "white", border: `2px solid ${INK}`, padding: "5px 10px", fontFamily: "Bangers,cursive", fontSize: 12, cursor: "pointer", boxShadow: `2px 2px 0 ${INK}`, color: INK }}>KEEP</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirming(a.agentId)} style={{ background: "white", border: `2px solid ${RED}`, padding: "5px 10px", fontFamily: "Bangers,cursive", fontSize: 12, cursor: "pointer", boxShadow: `2px 2px 0 ${RED}`, color: RED }}>FORGET ME</button>
                )}
              </div>
              {a.traits && a.traits.O > 0 && (
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  {TRAITS.map(([k, label, c]) => (
                    <div key={k} style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>{label}: <span style={{ color: c }}>{a.traits[k]}%</span></div>
                  ))}
                </div>
              )}
              {a.voiceNotes.length > 0 && (
                <div style={{ marginTop: 10, borderTop: `2px dashed #ddd`, paddingTop: 8 }}>
                  <div style={{ fontFamily: "Bangers,cursive", fontSize: 11, color: "#aaa", letterSpacing: 1, marginBottom: 6 }}>WHAT {ag.name.toUpperCase()} REMEMBERS FROM CALLS:</div>
                  {a.voiceNotes.map((n, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5 }}>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: INK, background: "#fffbe8", border: `2px solid ${INK}`, padding: "4px 8px" }}>{n}</div>
                      <button onClick={() => deleteNote(a.agentId, i)} title="Delete this memory" style={{ background: "white", border: `2px solid ${INK}`, cursor: "pointer", fontSize: 12, padding: "3px 7px", boxShadow: `2px 2px 0 ${INK}` }}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    <style>{`*{box-sizing:border-box;margin:0;padding:0;}body{background:linear-gradient(165deg,#f7efe3 0%,#eee0cb 55%,#e3cfae 100%);min-height:100vh;}`}</style>
  </>);
}
