// CEO task board — interactive kanban. Assign work to the autonomous team; they read it.
// Founder-only: enter your STATS_KEY once (stored locally). Persists via /api/board (Supabase).
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

const T = { bg: "#0b0a12", panel: "rgba(255,255,255,0.05)", panel2: "rgba(255,255,255,0.08)", line: "rgba(255,255,255,0.12)", text: "#f5f3ff", sub: "#a39fb8", grad: "linear-gradient(135deg,#ff5e7e,#8b5cf6)", pink: "#ff5e7e", violet: "#8b5cf6", teal: "#2dd4bf" };
const font = "'Inter',system-ui,-apple-system,sans-serif";
const COLS = [
  { id: "todo", label: "📋 To Do", accent: "#a39fb8" },
  { id: "inprogress", label: "🔨 In Progress", accent: "#f5c84b" },
  { id: "done", label: "✅ Done", accent: "#4ade80" },
];
const KEYLS = "rico_board_key";

// Color-coded team — each member gets a consistent hue for visual scanning.
const MEMBER_COLOR = {
  CEO: "#ff5e7e", Atlas: "#8b5cf6", Sage: "#f5c84b", Nova: "#2dd4bf", Forge: "#60a5fa",
  Sentry: "#f97316", Pulse: "#a3e635", Beacon: "#ec4899", Echo: "#c084fc", Reel: "#34d399", Keeper: "#94a3b8",
};
const memberColor = (m) => MEMBER_COLOR[m] || "#8b5cf6";

export default function Board() {
  const [key, setKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState(["CEO", "Atlas", "Sage", "Nova", "Forge", "Sentry", "Pulse", "Beacon", "Echo", "Reel", "Keeper"]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("Forge");

  useEffect(() => { try { const k = localStorage.getItem(KEYLS); if (k) setKey(k); } catch (e) {} }, []);

  const api = useCallback(async (method, body) => {
    const r = await fetch(`/api/board?key=${encodeURIComponent(key)}`, {
      method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401) { setErr("Wrong key."); return null; }
    const d = await r.json();
    return d;
  }, [key]);

  const load = useCallback(async () => {
    if (!key) return;
    setLoading(true); setErr("");
    const d = await api("GET");
    setLoading(false);
    if (d?.ok) { setTasks(d.tasks || []); if (d.team) setTeam(d.team); }
  }, [key, api]);

  useEffect(() => { if (key) { try { localStorage.setItem(KEYLS, key); } catch (e) {} load(); } }, [key, load]);

  const act = async (body) => { const d = await api("POST", body); if (d?.ok) setTasks(d.tasks); else if (d?.error) setErr(d.error); };
  const add = async () => { if (!newTitle.trim()) return; await act({ action: "add", title: newTitle.trim(), assignee: newAssignee, status: "todo" }); setNewTitle(""); };
  const move = (t, dir) => { const order = ["todo", "inprogress", "done"]; const i = order.indexOf(t.status); const ni = Math.min(order.length - 1, Math.max(0, i + dir)); if (ni !== i) act({ action: "move", id: t.id, status: order[ni] }); };
  const assign = (t, who) => act({ action: "assign", id: t.id, assignee: who });
  const del = (t) => act({ action: "delete", id: t.id });
  const seed = () => act({ action: "seed" });

  // ---- key gate ----
  if (!key) {
    return (
      <Shell>
        <div style={{ maxWidth: 380, margin: "12vh auto", textAlign: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>Rico — CEO Board</div>
          <div style={{ color: T.sub, marginBottom: 20, fontSize: 14 }}>Founder access. Enter your stats key.</div>
          <input value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="STATS_KEY" type="password"
            style={inp} onKeyDown={e => e.key === "Enter" && keyInput && setKey(keyInput)} />
          <button onClick={() => keyInput && setKey(keyInput)} style={{ ...btnGrad, width: "100%", marginTop: 12 }}>Unlock board</button>
          {err && <div style={{ color: T.pink, marginTop: 12, fontSize: 13 }}>{err}</div>}
        </div>
      </Shell>
    );
  }

  const counts = COLS.map(c => tasks.filter(t => t.status === c.id).length);

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>🦸 Rico — CEO Task Board</div>
          <div style={{ color: T.sub, fontSize: 13 }}>Assign work to the team — they read this every morning at 11am CST.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={btnGhost}>↻ Refresh</button>
          {!tasks.length && <button onClick={seed} style={btnGrad}>Seed current work</button>}
          <button onClick={() => { try { localStorage.removeItem(KEYLS); } catch (e) {} setKey(""); }} style={btnGhost}>Lock</button>
        </div>
      </div>

      {/* add task */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, padding: 12 }}>
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="New task…" style={{ ...inp, flex: 1, minWidth: 200, marginBottom: 0 }} onKeyDown={e => e.key === "Enter" && add()} />
        <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} style={sel}>
          {team.map(m => <option key={m} value={m} style={{ color: "#000" }}>{m}</option>)}
        </select>
        <button onClick={add} style={btnGrad}>+ Assign</button>
      </div>

      {err && <div style={{ color: T.pink, marginBottom: 12, fontSize: 13 }}>{err}{" "}<button onClick={() => setErr("")} style={{ ...btnGhost, padding: "2px 8px" }}>×</button></div>}
      {loading && <div style={{ color: T.sub, marginBottom: 12 }}>Loading…</div>}

      {/* visual summary: progress + workload */}
      {tasks.length > 0 && (() => {
        const total = tasks.length, done = counts[2], pct = Math.round((done / total) * 100);
        const load = {};
        tasks.filter(t => t.status !== "done").forEach(t => { load[t.assignee] = (load[t.assignee] || 0) + 1; });
        const workload = Object.entries(load).sort((a, b) => b[1] - a[1]);
        return (
          <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 18, padding: 16, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>Progress</span>
              <span style={{ color: T.sub, fontSize: 12.5 }}>{done}/{total} done · {pct}%</span>
            </div>
            <div style={{ height: 12, borderRadius: 100, background: "rgba(255,255,255,0.08)", overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${(counts[2] / total) * 100}%`, background: "#4ade80" }} title={`${counts[2]} done`} />
              <div style={{ width: `${(counts[1] / total) * 100}%`, background: "#f5c84b" }} title={`${counts[1]} in progress`} />
              <div style={{ width: `${(counts[0] / total) * 100}%`, background: "rgba(255,255,255,0.14)" }} title={`${counts[0]} to do`} />
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11.5, color: T.sub, flexWrap: "wrap" }}>
              <span><span style={dot("#4ade80")} />Done {counts[2]}</span>
              <span><span style={dot("#f5c84b")} />In progress {counts[1]}</span>
              <span><span style={dot("rgba(255,255,255,0.3)")} />To do {counts[0]}</span>
            </div>
            {workload.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 11.5, color: T.sub, marginRight: 2 }}>Open workload:</span>
                {workload.map(([m, n]) => (
                  <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: T.text, background: `${memberColor(m)}22`, border: `1px solid ${memberColor(m)}66`, padding: "3px 10px", borderRadius: 100 }}>
                    <span style={dot(memberColor(m))} />{m} · {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, alignItems: "start" }}>
        {COLS.map((c, ci) => (
          <div key={c.id} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 18, padding: 14, minHeight: 120 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{c.label}</span>
              <span style={{ color: T.sub, fontSize: 12, background: T.panel2, padding: "2px 9px", borderRadius: 100 }}>{counts[ci]}</span>
            </div>
            {tasks.filter(t => t.status === c.id).map(t => (
              <div key={t.id} style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 12, padding: 11, marginBottom: 9 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.4, marginBottom: 9 }}>{t.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <select value={t.assignee} onChange={e => assign(t, e.target.value)} title="Assign to"
                    style={{ ...sel, padding: "4px 9px", fontSize: 11.5, fontWeight: 700, background: `${memberColor(t.assignee)}26`, color: T.text, border: `1px solid ${memberColor(t.assignee)}77` }}>
                    {team.map(m => <option key={m} value={m} style={{ color: "#000" }}>{m}</option>)}
                  </select>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => move(t, -1)} disabled={ci === 0} style={mvBtn(ci === 0)} title="Move left">←</button>
                  <button onClick={() => move(t, 1)} disabled={ci === 2} style={mvBtn(ci === 2)} title="Move right">→</button>
                  <button onClick={() => del(t)} style={{ ...mvBtn(false), color: T.pink }} title="Delete">✕</button>
                </div>
              </div>
            ))}
            {counts[ci] === 0 && <div style={{ color: T.sub, fontSize: 12, opacity: 0.6, padding: "6px 2px" }}>Nothing here.</div>}
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (<>
    <Head><title>Rico — CEO Board</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: font, padding: "24px clamp(12px,4vw,40px)" }}>{children}</div>
  </>);
}

const inp = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", color: "#f5f3ff", borderRadius: 10, padding: "11px 13px", fontSize: 14, fontFamily: font, outline: "none" };
const sel = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "#f5f3ff", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: font, outline: "none", cursor: "pointer" };
const btnGrad = { background: "linear-gradient(135deg,#ff5e7e,#8b5cf6)", border: "none", color: "#fff", fontWeight: 800, fontSize: 13.5, padding: "10px 18px", borderRadius: 100, cursor: "pointer", fontFamily: font };
const btnGhost = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "#f5f3ff", fontWeight: 700, fontSize: 13, padding: "9px 14px", borderRadius: 100, cursor: "pointer", fontFamily: font };
const mvBtn = (disabled) => ({ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "#f5f3ff", fontWeight: 800, fontSize: 13, width: 30, height: 28, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.35 : 1, fontFamily: font });
const dot = (c) => ({ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 5, verticalAlign: "middle" });
