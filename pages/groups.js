// Groups & agent-led clubs (AGENTCONNECT-SPEC §4, Phase 2).
// Groups live in localStorage for the prototype; orchestration is server-side (/api/group).
import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useUser } from "@clerk/nextjs";
import { AGENT_LIST, getAgent, CLUBS } from "../lib/agents";
import TonyCharacter from "../components/TonyCharacter";
import GameBoard from "../components/GameBoard";
import GroupVoiceCall from "../components/GroupVoiceCall";
import ClubFeed from "../components/ClubFeed";
import { getStoredPref, getDetectedLang, detectLang, storeDetectedLang } from "../lib/i18n";

const GROUP_GAMES = [
  { key: "ludo", icon: "🎲", label: "Ludo", multi: true },
  { key: "racing", icon: "🏎️", label: "Dice Dash", multi: true },
  { key: "uno", icon: "🎴", label: "Color Clash", multi: true },
  { key: "chess", icon: "♟", label: "Chess" },
  { key: "checkers", icon: "🔴", label: "Checkers" },
  { key: "c4", icon: "🔵", label: "Connect 4" },
  { key: "ttt", icon: "⭕", label: "Tic-Tac-Toe" },
];

const INK = "#1a1008";
const YELLOW = "#ffe566";
const RED = "#e63946";
const PURPLE = "#7c4fcd";

const load = () => { try { return JSON.parse(localStorage.getItem("hitony_groups") || "[]"); } catch (e) { return []; } };
const save = (g) => localStorage.setItem("hitony_groups", JSON.stringify(g));
const loadSeen = () => { try { return JSON.parse(localStorage.getItem("hitony_club_seen") || "{}"); } catch (e) { return {}; } };
const saveSeen = (s) => localStorage.setItem("hitony_club_seen", JSON.stringify(s));

export default function Groups() {
  const { user, isLoaded, isSignedIn } = useUser();
  useEffect(() => { if (isLoaded && !isSignedIn) window.location.href = "/"; }, [isLoaded, isSignedIn]);
  const [groups, setGroups] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [viewingClub, setViewingClub] = useState(null); // shared, persistent club feed (AGENTCONNECT-SPEC §4)
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAgents, setNewAgents] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(null); // agent name currently "typing"
  const [ready, setReady] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [boardGame, setBoardGame] = useState(null);
  const [voiceCall, setVoiceCall] = useState(false);
  const [clubActivity, setClubActivity] = useState({}); // clubId -> { count, latest }
  const [clubSeen, setClubSeen] = useState({}); // clubId -> ISO string of last visit
  const panelRef = useRef(null);
  const langRef = useRef("en");
  const userName = user?.firstName || "";

  useEffect(() => {
    setGroups(load());
    setClubSeen(loadSeen());
    const p = getStoredPref();
    langRef.current = p === "auto" ? (getDetectedLang() || "en") : p;
    setReady(true);
    Promise.all(CLUBS.map(c =>
      fetch(`/api/club-feed?clubId=${c.id}&peek=1`).then(r => r.json()).then(d => [c.id, d]).catch(() => [c.id, null])
    )).then(pairs => {
      const next = {};
      for (const [id, d] of pairs) if (d?.ok) next[id] = { count: d.count, latest: d.latest };
      setClubActivity(next);
    });
  }, []);
  useEffect(() => { if (panelRef.current) panelRef.current.scrollTop = panelRef.current.scrollHeight; }, [groups, typing, activeId]);

  const active = groups.find(g => g.id === activeId);

  function update(groupId, fn) {
    setGroups(prev => { const next = prev.map(g => g.id === groupId ? fn(g) : g); save(next); return next; });
  }

  async function kickoff(group) {
    setTyping(getAgent(group.agentIds[0]).name);
    try {
      const r = await fetch("/api/group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "kickoff", groupName: group.name, agents: group.agentIds, userName, language: langRef.current, theme: group.theme }) });
      const d = await r.json();
      (d.replies || []).forEach(rep => update(group.id, g => ({ ...g, messages: [...g.messages, { from: rep.agentId, text: rep.text }] })));
    } catch (e) {}
    setTyping(null);
  }

  function createGroup(name, agentIds, theme) {
    const g = { id: "g" + Date.now(), name, agentIds, theme: theme || null, messages: [] };
    const next = [...groups, g]; setGroups(next); save(next);
    setActiveId(g.id); setCreating(false); setNewName(""); setNewAgents([]);
    setTimeout(() => kickoff(g), 100);
  }

  async function send() {
    const text = input.trim();
    if (!text || !active || typing) return;
    setInput("");
    if (getStoredPref() === "auto") { const d = detectLang(text); if (d) { langRef.current = d; storeDetectedLang(d); } }
    const withUser = { ...active, messages: [...active.messages, { from: "user", text }] };
    update(active.id, () => withUser);
    setTyping("…");
    try {
      const r = await fetch("/api/group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", groupName: active.name, agents: active.agentIds, messages: withUser.messages, userName, language: langRef.current }) });
      const d = await r.json();
      for (const rep of d.replies || []) {
        setTyping(getAgent(rep.agentId).name);
        await new Promise(rs => setTimeout(rs, 700));
        update(active.id, g => ({ ...g, messages: [...g.messages, { from: rep.agentId, text: rep.text }] }));
      }
    } catch (e) {
      update(active.id, g => ({ ...g, messages: [...g.messages, { from: active.agentIds[0], text: "*Something glitched on our end — say that again?*" }] }));
    }
    setTyping(null);
  }

  function launchGame(key) {
    setShowGames(false); setBoardGame(key);
    if (isSignedIn && user?.id) fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, event: "game", game: key }) }).catch(() => {});
  }

  async function handleGameEnd(winnerName, gameLabel) {
    setBoardGame(null);
    const grp = groups.find(g => g.id === activeId);
    if (!grp) return;
    const situation = winnerName === "You"
      ? `The group just finished a game of ${gameLabel} and YOU (${userName || "the user"}) won! React in-character with playful trash talk, congratulations, and demands for a rematch. Keep it short — 1-2 sentences each.`
      : winnerName
        ? `The group just finished a game of ${gameLabel} and ${winnerName} won! React in-character — mix congratulations for the winner, friendly excuses, and demands for a rematch. Keep it short — 1-2 sentences each.`
        : `The group just finished a game of ${gameLabel} — it was a draw! React in-character with playful banter about how nobody could beat anyone. Keep it short.`;
    update(grp.id, g => ({ ...g, messages: [...g.messages, { from: "system", text: `🎮 *${gameLabel} just ended${winnerName ? ` — ${winnerName === "You" ? (userName || "You") : winnerName} won` : " in a draw"}!*` }] }));
    setTyping("…");
    try {
      const r = await fetch("/api/group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "chat", groupName: grp.name, agents: grp.agentIds, messages: [...grp.messages, { from: "user", text: situation }], userName, language: langRef.current }) });
      const d = await r.json();
      for (const rep of d.replies || []) {
        setTyping(getAgent(rep.agentId).name);
        await new Promise(rs => setTimeout(rs, 700));
        update(grp.id, g => ({ ...g, messages: [...g.messages, { from: rep.agentId, text: rep.text }] }));
      }
    } catch (e) {}
    setTyping(null);
  }

  function joinClub(c) {
    setViewingClub(c);
    const next = { ...clubSeen, [c.id]: new Date().toISOString() };
    setClubSeen(next); saveSeen(next);
  }

  function deleteGroup(id) {
    const next = groups.filter(g => g.id !== id); setGroups(next); save(next);
    if (activeId === id) { setActiveId(null); setVoiceCall(false); }
  }

  if (!ready) return null;

  return (<>
    <Head>
      <title>ricomates</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />    </Head>
    <div style={{ height: "calc(100vh - 36px)", maxWidth: 560, margin: "18px auto", border: "none", borderRadius: 26, boxShadow: "0 24px 70px rgba(0,0,0,0.5)", background: "#1d1a30", fontFamily: "'DM Sans',sans-serif", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", backgroundImage: "none" }}>

      {/* header */}
      <div style={{ background: "#14121f", borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "none", zIndex: 2 }}>
        {(active || viewingClub)
          ? <button onClick={() => { setActiveId(null); setViewingClub(null); setVoiceCall(false); }} style={{ background: "#1a1826", border: "1px solid rgba(255,255,255,0.1)", padding: "4px 10px", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, cursor: "pointer", color: "#f5f3ff", boxShadow: "none" }}>← GROUPS</button>
          : <a href="/" style={{ background: "#1a1826", border: "1px solid rgba(255,255,255,0.1)", padding: "4px 10px", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, textDecoration: "none", color: "#f5f3ff", boxShadow: "none" }}>← CHAT</a>}
        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, color: "#f5f3ff", letterSpacing: 2 }}>{active ? active.name.toUpperCase() : viewingClub ? `${viewingClub.emoji} ${viewingClub.name}`.toUpperCase() : "👥 GROUPS"}</div>
        {active
          ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setShowGames(true)} title="Play a game with the group" style={{ background: "#1a1826", border: "1px solid rgba(255,255,255,0.1)", padding: "4px 9px", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, cursor: "pointer", color: "#f5f3ff", boxShadow: "none" }}>🎮 PLAY</button>
              <button onClick={() => setVoiceCall(v => !v)} title={voiceCall ? "End call" : "Group voice call"} style={{ background: voiceCall ? "#e63946" : "#1a1826", border: "1px solid rgba(255,255,255,0.1)", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 15, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>{voiceCall ? "📵" : "🎙"}</button>
              <div style={{ display: "flex" }}>{active.agentIds.map((id, i) => (
                <div key={id} title={getAgent(id).name} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: getAgent(id).look.hoodie || "#2b2742", overflow: "hidden", marginLeft: i ? -8 : 0, display: "flex", justifyContent: "center" }}>
                  <div style={{ marginTop: 1 }}><TonyCharacter size={48} look={getAgent(id).look} float="none" animated={false} pose="down" /></div>
                </div>))}</div>
            </div>
          : viewingClub
            ? <div style={{ display: "flex" }}>{(viewingClub.agents || []).map((id, i) => (
                <div key={id} title={getAgent(id).name} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: getAgent(id).look.hoodie || "#2b2742", overflow: "hidden", marginLeft: i ? -8 : 0, display: "flex", justifyContent: "center" }}>
                  <div style={{ marginTop: 1 }}><TonyCharacter size={48} look={getAgent(id).look} float="none" animated={false} pose="down" /></div>
                </div>))}</div>
            : <a href="/discover" style={{ background: "#1a1826", border: "1px solid rgba(255,255,255,0.1)", padding: "4px 10px", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, textDecoration: "none", color: "#f5f3ff", boxShadow: "none" }}>🔍</a>}
      </div>

      {viewingClub ? (
        <ClubFeed club={viewingClub} userId={user?.id} userName={userName} lang={langRef.current} />
      ) : !active ? (
        /* ===== group list + clubs ===== */
        <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: 70 }}>
          {groups.length > 0 && <>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, color: "#a9a5c0", letterSpacing: 1, marginBottom: 8 }}>MY GROUPS</div>
            {groups.map(g => (
              <div key={g.id} style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#1a1826", boxShadow: "none", padding: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setActiveId(g.id)}>
                  <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 17, color: "#f5f3ff", letterSpacing: 1 }}>{g.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#a9a5c0" }}>{g.agentIds.map(id => getAgent(id).name).join(", ")} · {g.messages.length} msgs</div>
                </div>
                <button onClick={() => setActiveId(g.id)} style={{ background: "#7c4dd8", color: "white", border: "1px solid rgba(255,255,255,0.1)", padding: "5px 12px", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, cursor: "pointer", boxShadow: "none" }}>OPEN</button>
                <button onClick={() => deleteGroup(g.id)} style={{ background: "#1a1826", border: "1px solid rgba(255,255,255,0.1)", padding: "5px 8px", fontSize: 11, cursor: "pointer", color: "#a9a5c0" }}>🗑</button>
              </div>
            ))}
          </>}

          <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, color: "#a9a5c0", letterSpacing: 1, margin: "14px 0 8px" }}>CLUBS — HOSTED BY YOUR FRIENDS</div>
          {CLUBS.map(c => {
            const activity = clubActivity[c.id];
            const seen = clubSeen[c.id];
            const isNew = activity?.latest && seen && new Date(activity.latest) > new Date(seen);
            return (
            <div key={c.id} style={{ border: "1px solid rgba(167,139,250,0.4)", background: "#1a1826", boxShadow: "none", padding: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 26 }}>{c.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, color: "#f5f3ff", letterSpacing: 1, display: "flex", alignItems: "center", gap: 6 }}>
                  {c.name}
                  {isNew && <span style={{ background: "#d6365e", color: "white", fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 800, borderRadius: 100, padding: "2px 8px", letterSpacing: 0 }}>NEW POSTS</span>}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a9a5c0" }}>hosted by {getAgent(c.host).name} · {c.theme}</div>
              </div>
              <button onClick={() => joinClub(c)} style={{ background: "#d6365e", color: "white", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 12px", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, cursor: "pointer", boxShadow: "none" }}>JOIN</button>
            </div>
            );
          })}

          {!creating ? (
            <button onClick={() => setCreating(true)} style={{ width: "100%", marginTop: 12, background: "#14121f", border: "1px solid rgba(255,255,255,0.1)", padding: 12, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 17, cursor: "pointer", boxShadow: "none", color: "#f5f3ff", letterSpacing: 1 }}>+ CREATE YOUR OWN GROUP</button>
          ) : (
            <div style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#1a1826", boxShadow: "none", padding: 14, marginTop: 12 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name…" style={{ width: "100%", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 10px", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, outline: "none", marginBottom: 10 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a9a5c0", marginBottom: 6 }}>PICK 2–4 FRIENDS:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {AGENT_LIST.map(a => {
                  const on = newAgents.includes(a.id);
                  return <button key={a.id} onClick={() => setNewAgents(p => on ? p.filter(x => x !== a.id) : p.length < 4 ? [...p, a.id] : p)} style={{ background: on ? PURPLE : "#1a1826", color: on ? "#fff" : "#f5f3ff", border: "1px solid rgba(255,255,255,0.1)", padding: "4px 10px", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, cursor: "pointer", boxShadow: "none" }}>{a.emoji} {a.name}</button>;
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={!newName.trim() || newAgents.length < 2} onClick={() => createGroup(newName.trim(), newAgents)} style={{ flex: 1, background: "#d6365e", color: "white", border: "1px solid rgba(255,255,255,0.1)", padding: 10, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, cursor: "pointer", boxShadow: "none", opacity: (!newName.trim() || newAgents.length < 2) ? 0.5 : 1 }}>START IT!</button>
                <button onClick={() => setCreating(false)} style={{ background: "#1a1826", border: "1px solid rgba(255,255,255,0.1)", padding: 10, fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, cursor: "pointer", boxShadow: "none", color: "#f5f3ff" }}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ===== group chat ===== */
        <>
          <div ref={panelRef} style={{ flex: 1, overflowY: "auto", padding: 14, paddingBottom: 60, display: "flex", flexDirection: "column", gap: 10 }}>
            {active.messages.map((m, i) => {
              if (m.from === "system") return (
                <div key={i} style={{ textAlign: "center" }}>
                  <span style={{ display: "inline-block", background: "#14121f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "3px 12px", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, color: "#f5f3ff", letterSpacing: 0.5, boxShadow: "none" }}>{m.text.replace(/\*/g, "")}</span>
                </div>
              );
              const isUser = m.from === "user";
              const a = isUser ? null : getAgent(m.from);
              return (
                <div key={i} style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
                  {!isUser && <div style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", background: a.look.hoodie || "#2b2742", overflow: "hidden", flexShrink: 0, display: "flex", justifyContent: "center" }}>
                    <div style={{ marginTop: 1 }}><TonyCharacter size={56} look={a.look} float="none" animated={false} pose="down" /></div>
                  </div>}
                  <div style={{ maxWidth: "76%" }}>
                    {!isUser && <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 10, color: "#c4b5fd", letterSpacing: 1, marginBottom: 2 }}>{a.emoji} {a.name.toUpperCase()}</div>}
                    <div style={{ background: isUser ? "#1d1a30" : "#1a1826", border: "1px solid rgba(255,255,255,0.1)", borderLeft: isUser ? "1px solid rgba(255,255,255,0.1)" : `3px solid ${a.look.hoodie || "#2b2742"}`, borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px", padding: "8px 12px", fontWeight: 700, fontSize: 13, color: "#f5f3ff", lineHeight: 1.5, boxShadow: "none" }}>
                      {m.text.replace(/\*(.*?)\*/g, "$1")}
                    </div>
                  </div>
                </div>
              );
            })}
            {typing && <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 12, color: "#a9a5c0", letterSpacing: 1 }}>{typing === "…" ? "SOMEONE IS TYPING…" : `${typing.toUpperCase()} IS TYPING…`}</div>}
          </div>
          <div style={{ background: "#14121f", borderTop: "1px solid rgba(255,255,255,0.1)", padding: "10px 12px", display: "flex", gap: 8, zIndex: 2 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} rows={1}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Say something to the group…"
              style={{ flex: 1, border: "1px solid rgba(255,255,255,0.1)", background: "#1a1826", padding: "9px 12px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, resize: "none", outline: "none", boxShadow: "none", color: "#f5f3ff" }} />
            <button onClick={send} disabled={!!typing} style={{ background: "#d6365e", color: "white", border: "1px solid rgba(255,255,255,0.1)", padding: "9px 14px", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 16, cursor: "pointer", boxShadow: "none" }}>SEND!</button>
          </div>
        </>
      )}

    </div>

    {/* game picker — play with the group */}
    {showGames && active && (
      <div onClick={() => setShowGames(false)} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(8,7,14,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: "#1d1a30", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "none", borderRadius: 18, padding: 18, fontFamily: "'DM Sans',sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 22, color: "#f5f3ff", letterSpacing: 1 }}>🎮 PLAY WITH THE GROUP</div>
            <button onClick={() => setShowGames(false)} style={{ background: "#1a1826", border: "1px solid rgba(255,255,255,0.1)", width: 30, height: 30, fontSize: 14, cursor: "pointer", boxShadow: "none" }}>✕</button>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#a9a5c0", marginBottom: 12 }}>{active.agentIds.slice(0, 3).map(id => getAgent(id).name).join(", ")} are in. Multiplayer games seat the whole crew!</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {GROUP_GAMES.map(g => (
              <button key={g.key} onClick={() => launchGame(g.key)} style={{ display: "flex", alignItems: "center", gap: 8, background: g.multi ? PURPLE : "#1a1826", color: g.multi ? "#fff" : "#f5f3ff", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 12px", fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 14, letterSpacing: 1, cursor: "pointer", boxShadow: "none", textAlign: "left" }}>
                <span style={{ fontSize: 18 }}>{g.icon}</span>
                <span>{g.label}{g.multi && <span style={{ display: "block", fontSize: 8.5, opacity: 0.85, letterSpacing: 0 }}>4-PLAYER</span>}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )}

    {boardGame && active && (
      <GameBoard
        game={boardGame}
        agent={getAgent(active.agentIds[0])}
        friends={active.agentIds.map(id => getAgent(id).name)}
        onClose={() => setBoardGame(null)}
        onGameEnd={handleGameEnd}
      />
    )}

    {voiceCall && active && (
      <GroupVoiceCall
        group={active}
        userName={userName}
        userId={user?.id}
        lang={langRef.current}
        onMessage={(msg) => update(active.id, g => ({ ...g, messages: [...g.messages, msg] }))}
        onEnd={() => setVoiceCall(false)}
      />
    )}

    <style>{`*{box-sizing:border-box;margin:0;padding:0;}body{background:#0f0e17;min-height:100vh;}`}</style>
  </>);
}
