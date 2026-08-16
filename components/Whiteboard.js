// Whiteboard — a drawing canvas for teaching. The sketch is exported to PNG and sent
// to the (vision-capable) student so they actually "see" what you drew and learn from it.
import { useRef, useEffect, useState, useCallback } from "react";

const COLORS = ["#1a1530", "#ff5e7e", "#8b5cf6", "#2563eb", "#16a34a", "#f59e0b"];
const T = { bg: "#0f0e17", panel: "rgba(255,255,255,0.08)", line: "rgba(255,255,255,0.12)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)" };
const font = "'Inter',system-ui,sans-serif";

export default function Whiteboard({ onTeach, onClose, busy }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const undoStack = useRef([]);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const [eraser, setEraser] = useState(false);
  const [empty, setEmpty] = useState(true);

  const fillWhite = useCallback((ctx, w, h) => { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    fillWhite(ctx, rect.width, rect.height);
    ctxRef.current = ctx;
  }, [fillWhite]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const snapshot = () => { try { undoStack.current.push(canvasRef.current.toDataURL()); if (undoStack.current.length > 25) undoStack.current.shift(); } catch (e) {} };

  const start = (e) => { e.preventDefault(); snapshot(); drawing.current = true; last.current = pos(e); };
  const move = (e) => {
    if (!drawing.current) return; e.preventDefault();
    const ctx = ctxRef.current; const p = pos(e);
    ctx.strokeStyle = eraser ? "#ffffff" : color;
    ctx.lineWidth = eraser ? size * 4 : size;
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p; if (empty) setEmpty(false);
  };
  const end = () => { drawing.current = false; };

  const undo = () => {
    const url = undoStack.current.pop(); if (!url) return;
    const img = new Image();
    img.onload = () => { const c = canvasRef.current; const ctx = ctxRef.current; const r = c.getBoundingClientRect(); ctx.clearRect(0, 0, r.width, r.height); fillWhite(ctx, r.width, r.height); ctx.drawImage(img, 0, 0, r.width, r.height); };
    img.src = url;
  };
  const clear = () => { const c = canvasRef.current; const ctx = ctxRef.current; const r = c.getBoundingClientRect(); snapshot(); fillWhite(ctx, r.width, r.height); setEmpty(true); };
  const teach = () => { if (empty || busy) return; onTeach(canvasRef.current.toDataURL("image/png")); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 205, background: "rgba(8,7,14,0.94)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, fontFamily: font }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 16 }}>🖊 Whiteboard</div>
          <button onClick={onClose} style={{ background: T.panel, border: `1px solid ${T.line}`, color: T.text, width: 32, height: 32, borderRadius: "50%", cursor: "pointer" }}>✕</button>
        </div>

        <canvas ref={canvasRef} onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          style={{ width: "100%", height: 340, borderRadius: 16, background: "#fff", touchAction: "none", cursor: "crosshair", boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }} />

        {/* toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); setEraser(false); }} style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: color === c && !eraser ? "3px solid #fff" : `1px solid ${T.line}`, cursor: "pointer", flexShrink: 0 }} />
          ))}
          <button onClick={() => setEraser(e => !e)} title="Eraser" style={{ width: 34, height: 30, borderRadius: 8, background: eraser ? T.grad : T.panel, border: `1px solid ${T.line}`, color: T.text, cursor: "pointer", fontSize: 14 }}>🩹</button>
          <input type="range" min="2" max="14" value={size} onChange={e => setSize(+e.target.value)} style={{ width: 70, accentColor: "#8b5cf6" }} />
          <button onClick={undo} style={{ background: T.panel, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 12, padding: "7px 12px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>↶ Undo</button>
          <button onClick={clear} style={{ background: T.panel, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 12, padding: "7px 12px", borderRadius: 100, cursor: "pointer", fontFamily: font }}>Clear</button>
        </div>

        <button onClick={teach} disabled={empty || busy} style={{ width: "100%", marginTop: 12, background: T.grad, border: "none", color: "#fff", fontWeight: 800, fontSize: 15, padding: "14px 0", borderRadius: 100, cursor: (empty || busy) ? "not-allowed" : "pointer", fontFamily: font, opacity: (empty || busy) ? 0.5 : 1 }}>
          {busy ? "Showing the class…" : "🎓 Show the class"}
        </button>
        <div style={{ color: T.sub, fontSize: 11, textAlign: "center", marginTop: 8 }}>Your students can actually see your sketch and learn from it.</div>
      </div>
    </div>
  );
}
