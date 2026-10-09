// Rough Notebook — teach Rico your handwriting once, then snap photos of your handwritten
// notes. Rico transcribes + remembers them and answers questions from them. Pages also
// feed your AI twin (see pages/api/notebook.js). Photos are never stored, only the text.
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useUser } from "@clerk/nextjs";
import { resizeImage } from "../lib/resizeImage";

const T = { bg: "#0f0e17", panel: "rgba(255,255,255,0.06)", panel2: "rgba(255,255,255,0.09)", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink: "#ff5e7e", violet: "#8b5cf6" };
const font = "'Inter',system-ui,-apple-system,sans-serif";
const card = { background: T.panel, border: `1px solid ${T.line}`, borderRadius: 18, padding: 16, marginBottom: 14 };
const btn = { background: T.grad, color: "#fff", border: "none", borderRadius: 14, padding: "12px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: font, display: "inline-block", textAlign: "center" };
const ghost = { ...btn, background: T.panel2, border: `1px solid ${T.line}`, color: T.text };

// a styled <label> around a hidden native file input — opens the camera on phones
function PhotoButton({ label, multiple, onFiles, style, disabled }) {
  return (
    <label style={{ ...style, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      {label}
      <input type="file" accept="image/*" capture={multiple ? undefined : "environment"} multiple={multiple} hidden
        onChange={e => { const f = [...e.target.files]; e.target.value = ""; if (f.length) onFiles(f); }} />
    </label>
  );
}

export default function Notebook() {
  const { user, isLoaded, isSignedIn } = useUser();
  useEffect(() => { if (isLoaded && !isSignedIn) window.location.href = "/"; }, [isLoaded, isSignedIn]);

  const [data, setData] = useState(null); // { handwriting, notes, sample }
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [recalibrate, setRecalibrate] = useState(false);

  const call = useCallback(async (body) => {
    const r = await fetch("/api/notebook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, ...body }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Something went wrong — try again.");
    return d;
  }, [user]);

  useEffect(() => { if (user) call({ mode: "get" }).then(setData).catch(e => setErr(e.message)); }, [user, call]);

  const calibrate = async ([file]) => {
    setErr(""); setBusy("Studying your handwriting…");
    try { setData(await call({ mode: "calibrate", image: await resizeImage(file, 1600, 0.85) })); setRecalibrate(false); }
    catch (e) { setErr(e.message); }
    setBusy("");
  };

  // ponytail: pages upload one at a time — keeps each request under the body limit and shows progress
  const addPages = async (files) => {
    setErr("");
    for (let i = 0; i < files.length; i++) {
      setBusy(`Reading page ${i + 1} of ${files.length}…`);
      try { setData(await call({ mode: "add", image: await resizeImage(files[i], 1600, 0.85) })); }
      catch (e) { setErr(`Page ${i + 1}: ${e.message}`); }
    }
    setBusy("");
  };

  const ask = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setErr(""); setAnswer(""); setBusy("Flipping through your notebook…");
    try { setAnswer((await call({ mode: "ask", question: q })).answer); } catch (e2) { setErr(e2.message); }
    setBusy("");
  };

  const del = async (id) => { try { setData(await call({ mode: "delete", id })); } catch (e) { setErr(e.message); } };

  const hw = data?.handwriting;
  const showCalibrate = data && (!hw || recalibrate);

  return (<>
    <Head><title>ricomates</title><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="theme-color" content="#0f0e17" /></Head>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 520, padding: "0 16px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0", borderBottom: `1px solid ${T.line}`, marginBottom: 16 }}>
          <a href="/" style={{ color: T.text, textDecoration: "none", fontSize: 20 }} aria-label="Back">←</a>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>📓 Rough Notebook</div>
            <div style={{ color: T.sub, fontSize: 11 }}>Your handwritten notes, remembered and searchable</div>
          </div>
        </div>

        {!data && !err && <div style={{ color: T.sub, textAlign: "center", padding: 40 }}>Opening your notebook…</div>}
        {busy && <div role="status" style={{ ...card, color: T.violet, fontWeight: 700, textAlign: "center" }}>✍️ {busy}</div>}
        {err && <div role="alert" style={{ color: T.pink, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{err}</div>}

        {showCalibrate && (
          <div style={card}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Step 1 · Teach Rico your handwriting</div>
            <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>On a sheet of paper, write these lines in your normal handwriting, then take a clear photo of it.</div>
            <div style={{ background: "#fffdf5", color: "#2b2b2b", borderRadius: 12, padding: "12px 14px", fontFamily: "'Courier New',monospace", fontSize: 13.5, lineHeight: 1.7, marginBottom: 12, overflowWrap: "anywhere" }}>
              {data.sample.map(l => <div key={l}>{l}</div>)}
            </div>
            <PhotoButton label="📷 Photo of my handwriting" onFiles={calibrate} style={{ ...btn, width: "100%" }} disabled={!!busy} />
            {hw && <button onClick={() => setRecalibrate(false)} style={{ ...ghost, width: "100%", marginTop: 8 }}>Cancel</button>}
          </div>
        )}

        {hw && !recalibrate && (
          <details style={card}>
            <summary style={{ color: T.text, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>✅ Rico knows your handwriting</summary>
            <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.55, marginTop: 10, whiteSpace: "pre-wrap" }}><b style={{ color: T.text }}>What it noticed:</b>{"\n"}{hw.profile}</div>
            <div style={{ color: T.sub, fontSize: 12.5, lineHeight: 1.55, marginTop: 10, whiteSpace: "pre-wrap" }}><b style={{ color: T.text }}>What it read from your sample:</b>{"\n"}{hw.readback}</div>
            <button onClick={() => setRecalibrate(true)} style={{ ...ghost, marginTop: 12, fontSize: 12.5, padding: "8px 12px" }}>Redo sample</button>
          </details>
        )}

        {data && (<>
          <div style={card}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{hw ? "Add notes" : "Step 2 · Add notes"}</div>
            <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>Snap a page, or pick several old pages at once. Rico keeps the text — never the photo.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <PhotoButton label="📷 Snap a page" onFiles={addPages} style={{ ...btn, flex: 1 }} disabled={!!busy} />
              <PhotoButton label="🖼 Upload pages" multiple onFiles={addPages} style={{ ...ghost, flex: 1 }} disabled={!!busy} />
            </div>
          </div>

          <form onSubmit={ask} style={card}>
            <label htmlFor="nbq" style={{ display: "block", color: T.text, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Ask your notebook</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="nbq" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. What did I write about my exam plan?"
                style={{ flex: 1, minWidth: 0, background: T.panel2, color: T.text, border: `1px solid ${T.line}`, borderRadius: 12, padding: "11px 12px", fontSize: 14, fontFamily: font, outline: "none" }} />
              <button type="submit" disabled={!!busy} style={{ ...btn, padding: "11px 14px" }}>Ask</button>
            </div>
            {answer && <div style={{ color: T.text, fontSize: 14, lineHeight: 1.55, marginTop: 12, whiteSpace: "pre-wrap" }}>{answer}</div>}
          </form>

          <div style={{ color: T.sub, fontSize: 12, fontWeight: 800, letterSpacing: 0.4, margin: "4px 2px 8px" }}>YOUR PAGES · {data.notes.length}</div>
          {data.notes.length === 0 && <div style={{ color: T.sub, fontSize: 13, textAlign: "center", padding: 20 }}>No pages yet.</div>}
          {data.notes.map(n => (
            <div key={n.id} style={{ ...card, padding: 14 }}>
              <button onClick={() => setOpen(open === n.id ? null : n.id)} aria-expanded={open === n.id}
                style={{ all: "unset", cursor: "pointer", display: "flex", width: "100%", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, color: T.text, fontWeight: 700, fontSize: 14 }}>{n.title}</span>
                <span style={{ color: T.sub, fontSize: 11 }}>{new Date(n.at).toLocaleDateString()}</span>
              </button>
              {open === n.id && (<>
                <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.6, marginTop: 10, whiteSpace: "pre-wrap" }}>{n.text}</div>
                <button onClick={() => del(n.id)} style={{ background: "transparent", border: "none", color: T.pink, fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 8, padding: 0, fontFamily: font }}>Delete page</button>
              </>)}
            </div>
          ))}
        </>)}
      </div>
    </div>
    <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } html, body { background: ${T.bg}; }`}</style>
  </>);
}
