// Interactive game boards vs a Rico character: Chess (minimax engine), Connect 4,
// Checkers, Tic-Tac-Toe. Each with IN-CHARACTER banter via /api/banter.
import { useState, useRef, useCallback, useEffect } from "react";
import { Chess } from "chess.js";
import TonyCharacter from "./TonyCharacter";

const T = { bg: "#0f0e17", panel: "rgba(255,255,255,0.06)", panel2: "rgba(255,255,255,0.09)", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)", pink: "#ff5e7e", violet: "#8b5cf6" };
const font = "'Inter',system-ui,-apple-system,sans-serif";
const GLYPH = { wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙", bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟" };
const PNAME = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------------- CHESS (minimax + alpha-beta, bot = Black) ---------------- */
const PV = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
function evalBoard(g) { let s = 0; for (const row of g.board()) for (const c of row) { if (!c) continue; const v = PV[c.type]; s += c.color === "b" ? v : -v; } return s; }
function orderMoves(g) { return g.moves({ verbose: true }).sort((a, b) => (b.captured ? PV[b.captured] : 0) - (a.captured ? PV[a.captured] : 0)); }
function minimax(g, depth, alpha, beta, maxing) {
  if (g.isGameOver()) { if (g.isCheckmate()) return maxing ? -100000 - depth : 100000 + depth; return 0; }
  if (depth === 0) return evalBoard(g);
  const moves = orderMoves(g);
  if (maxing) { let v = -1e9; for (const m of moves) { g.move({ from: m.from, to: m.to, promotion: "q" }); v = Math.max(v, minimax(g, depth - 1, alpha, beta, false)); g.undo(); alpha = Math.max(alpha, v); if (alpha >= beta) break; } return v; }
  let v = 1e9; for (const m of moves) { g.move({ from: m.from, to: m.to, promotion: "q" }); v = Math.min(v, minimax(g, depth - 1, alpha, beta, true)); g.undo(); beta = Math.min(beta, v); if (alpha >= beta) break; } return v;
}
function ChessGame({ say, friendName, onWin }) {
  const gameRef = useRef(new Chess());
  const [, setTick] = useState(0); const force = () => setTick((t) => t + 1);
  const [sel, setSel] = useState(null); const [targets, setTargets] = useState([]);
  const [status, setStatus] = useState("Your move — you're White."); const [over, setOver] = useState(false);
  const finish = () => { const g = gameRef.current; setOver(true); setSel(null); setTargets([]);
    if (g.isCheckmate()) { if (g.turn() === "w") { setStatus("Checkmate — I win!"); say("you just CHECKMATED your friend and won the chess game", "Checkmate — GG! 😏"); if (onWin) onWin(friendName || "Rico"); } else { setStatus("Checkmate — you win!"); say("your friend just checkmated you and won — congratulate them warmly", "You got me! Beautiful. 👏"); if (onWin) onWin("You"); } }
    else { setStatus("Draw."); say("the chess game ended in a draw", "A draw! Well fought. 🤝"); if (onWin) onWin(null); } };
  const botMove = useCallback(() => {
    const g = gameRef.current; const moves = orderMoves(g); if (!moves.length) return;
    const depth = moves.length > 12 ? 1 : moves.length > 6 ? 2 : 3; // adaptive: stay responsive, go deeper as the board clears
    let best = [], bestV = -1e9;
    for (const m of moves) { g.move({ from: m.from, to: m.to, promotion: "q" }); const v = minimax(g, depth, -1e9, 1e9, false); g.undo(); if (v > bestV) { bestV = v; best = [m]; } else if (v === bestV) best.push(m); }
    const mv = pick(best); const done = g.move({ from: mv.from, to: mv.to, promotion: "q" }); force();
    if (g.isGameOver()) return finish();
    if (g.isCheck()) { setStatus("Check! Your move."); say("you just put your friend in CHECK in chess", "Check! 😼"); }
    else if (done.captured) { setStatus("Your move."); say(`you just captured your friend's ${PNAME[done.captured]} in chess`, `Mmm, tasty ${PNAME[done.captured]}. 😋`); }
    else setStatus("Your move.");
  }, [say]);
  const onSquare = (sq) => { if (over) return; const g = gameRef.current; if (g.turn() !== "w") return;
    if (sel && targets.includes(sq)) { const mv = g.move({ from: sel, to: sq, promotion: "q" }); setSel(null); setTargets([]); force();
      if (g.isGameOver()) return finish(); setStatus("Thinking…");
      if (mv && mv.captured) say(`your friend just captured your ${PNAME[mv.captured]} in chess`, `Hey! My ${PNAME[mv.captured]}! 😤`);
      else if (g.isCheck()) say("your friend just put YOU in check in chess", "Ooh, check on me? Bold. 😏");
      setTimeout(botMove, 600); return; }
    const p = g.get(sq); if (p && p.color === "w") { setSel(sq); setTargets(g.moves({ square: sq, verbose: true }).map((m) => m.to)); } else { setSel(null); setTargets([]); } };
  const reset = () => { gameRef.current = new Chess(); setSel(null); setTargets([]); setOver(false); setStatus("New game — your move."); say("starting a fresh game of chess", "Rematch! Bring it. ♟️"); force(); };
  const board = gameRef.current.board();
  return (<>
    <div style={{ width: "min(88vw, 360px)", aspectRatio: "1", display: "grid", gridTemplateColumns: "repeat(8,1fr)", borderRadius: 12, overflow: "hidden", border: `1px solid ${T.line}`, boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}>
      {board.map((row, r) => row.map((cell, c) => { const sq = "abcdefgh"[c] + (8 - r); const light = (r + c) % 2 === 0; const isTarget = targets.includes(sq);
        return (<div key={sq} onClick={() => onSquare(sq)} style={{ position: "relative", background: sel === sq ? T.violet : light ? "#ded3ef" : "#6f5d99", display: "flex", alignItems: "center", justifyContent: "center", cursor: over ? "default" : "pointer", userSelect: "none" }}>
          {cell && <span style={{ fontSize: "min(7vw, 30px)", lineHeight: 1, color: cell.color === "w" ? "#fff" : "#160e26", textShadow: cell.color === "w" ? "0 1px 2px rgba(0,0,0,0.55)" : "none" }}>{GLYPH[cell.color + cell.type]}</span>}
          {isTarget && <span style={{ position: "absolute", width: cell ? "82%" : "30%", height: cell ? "82%" : "30%", borderRadius: "50%", border: cell ? `3px solid ${T.pink}` : "none", background: cell ? "transparent" : `${T.violet}cc` }} />}
        </div>); }))}
    </div>
    <div style={{ color: over ? "#4ade80" : T.sub, fontSize: 12.5, fontWeight: 600, marginTop: 10, minHeight: 16 }}>{status}</div>
    <button onClick={reset} style={btn}>New game</button>
  </>);
}

/* ---------------- TIC-TAC-TOE ---------------- */
const TLINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const tWin = (b) => { for (const [a,c,d] of TLINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]; return null; };
function TicTacToe({ say, friendName, onWin }) {
  const [b, setB] = useState(Array(9).fill(null)); const [status, setStatus] = useState("You're ❌ — tap a square."); const [over, setOver] = useState(false);
  const tap = (i) => { if (over || b[i]) return; let nb = [...b]; nb[i] = "X";
    if (tWin(nb)) { setB(nb); setOver(true); setStatus("You win!"); say("your friend just beat you at tic-tac-toe", "You win! Rematch? 😅"); if (onWin) onWin("You"); return; }
    if (nb.every(Boolean)) { setB(nb); setOver(true); setStatus("Draw."); say("tic-tac-toe ended in a draw", "Cat's game! 🤝"); if (onWin) onWin(null); return; }
    const empties = nb.map((v, k) => v ? null : k).filter((k) => k !== null);
    const tryWin = (m) => { for (const k of empties) { const t = [...nb]; t[k] = m; if (tWin(t) === m) return k; } return null; };
    let mv = tryWin("O"); const threat = mv !== null; if (mv === null) mv = tryWin("X"); if (mv === null && nb[4] == null) mv = 4;
    if (mv === null) { const co = [0,2,6,8].filter((k) => nb[k] == null); if (co.length) mv = pick(co); } if (mv === null) mv = pick(empties);
    nb[mv] = "O"; setB(nb);
    if (tWin(nb)) { setOver(true); setStatus("I win this one!"); say("you just won tic-tac-toe against your friend", "Gotcha! 😏"); if (onWin) onWin(friendName || "Rico"); }
    else if (nb.every(Boolean)) { setOver(true); setStatus("Draw."); say("tic-tac-toe ended in a draw", "Cat's game! 🤝"); }
    else { setStatus("Your move ❌"); if (threat || Math.random() < 0.5) say("mid-game in tic-tac-toe, your turn", "Your move, friend. 👀"); } };
  const reset = () => { setB(Array(9).fill(null)); setOver(false); setStatus("You're ❌ — tap a square."); say("starting a fresh game of tic-tac-toe", "Round two! 🎯"); };
  return (<>
    <div style={{ width: "min(78vw, 300px)", aspectRatio: "1", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
      {b.map((v, i) => (<div key={i} onClick={() => tap(i)} style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "min(14vw, 54px)", cursor: over || v ? "default" : "pointer", color: v === "X" ? T.pink : T.violet, fontWeight: 800 }}>{v}</div>))}
    </div>
    <div style={{ color: over ? "#4ade80" : T.sub, fontSize: 12.5, fontWeight: 600, marginTop: 12, minHeight: 16 }}>{status}</div>
    <button onClick={reset} style={btn}>New game</button>
  </>);
}

/* ---------------- CONNECT 4 (bot=Y, you=R) ---------------- */
const C4R = 6, C4C = 7;
const c4Win = (g) => { const D = [[0,1],[1,0],[1,1],[1,-1]]; for (let r = 0; r < C4R; r++) for (let c = 0; c < C4C; c++) { const p = g[r][c]; if (!p) continue; for (const [dr, dc] of D) { let k = 1; while (k < 4) { const nr = r + dr * k, nc = c + dc * k; if (nr < 0 || nr >= C4R || nc < 0 || nc >= C4C || g[nr][nc] !== p) break; k++; } if (k === 4) return p; } } return null; };
const c4Drop = (g, col, p) => { for (let r = C4R - 1; r >= 0; r--) if (!g[r][col]) { const ng = g.map((row) => [...row]); ng[r][col] = p; return ng; } return null; };
function c4Bot(g) { const cols = []; for (let c = 0; c < C4C; c++) if (!g[0][c]) cols.push(c);
  for (const c of cols) { const ng = c4Drop(g, c, "Y"); if (ng && c4Win(ng) === "Y") return c; }
  for (const c of cols) { const ng = c4Drop(g, c, "R"); if (ng && c4Win(ng) === "R") return c; }
  const safe = cols.filter((c) => { const ng = c4Drop(g, c, "Y"); if (!ng) return false; for (let uc = 0; uc < C4C; uc++) if (!ng[0][uc]) { const ug = c4Drop(ng, uc, "R"); if (ug && c4Win(ug) === "R") return false; } return true; });
  const pool = safe.length ? safe : cols; const minD = Math.min(...pool.map((c) => Math.abs(3 - c))); return pick(pool.filter((c) => Math.abs(3 - c) === minD)); }
function Connect4({ say, friendName, onWin }) {
  const [g, setG] = useState(Array.from({ length: C4R }, () => Array(C4C).fill(null))); const [status, setStatus] = useState("You're 🔴 — tap a column."); const [over, setOver] = useState(false);
  const drop = (col) => { if (over || g[0][col]) return; let ng = c4Drop(g, col, "R"); if (!ng) return;
    if (c4Win(ng) === "R") { setG(ng); setOver(true); setStatus("You win!"); say("your friend just got 4-in-a-row and beat you at Connect 4", "Four in a row?! You win 😅"); if (onWin) onWin("You"); return; }
    if (ng.every((row) => row.every(Boolean))) { setG(ng); setOver(true); setStatus("Board full — draw."); say("Connect 4 ended in a draw, board full", "Stalemate! 🤝"); if (onWin) onWin(null); return; }
    const bc = c4Bot(ng); ng = c4Drop(ng, bc, "Y"); setG(ng);
    if (c4Win(ng) === "Y") { setOver(true); setStatus("I win!"); say("you just got 4-in-a-row and won Connect 4", "Connect FOUR! 😏"); if (onWin) onWin(friendName || "Rico"); }
    else if (ng.every((row) => row.every(Boolean))) { setOver(true); setStatus("Draw."); say("Connect 4 ended in a draw", "Stalemate! 🤝"); }
    else { setStatus("Your move 🔴"); if (Math.random() < 0.45) say("mid-game in Connect 4, your turn to drop a piece", "Drop one, I dare you. 👀"); } };
  const reset = () => { setG(Array.from({ length: C4R }, () => Array(C4C).fill(null))); setOver(false); setStatus("You're 🔴 — tap a column."); say("starting a fresh game of Connect 4", "Fresh board! 🔴"); };
  return (<>
    <div style={{ background: "#3a2f63", padding: 8, borderRadius: 14, boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}>
      <div style={{ width: "min(86vw, 340px)", display: "grid", gridTemplateColumns: `repeat(${C4C},1fr)`, gap: 6 }}>
        {Array.from({ length: C4C }).map((_, c) => (<div key={c} onClick={() => drop(c)} style={{ display: "grid", gridTemplateRows: `repeat(${C4R},1fr)`, gap: 6, cursor: over || g[0][c] ? "default" : "pointer" }}>
          {Array.from({ length: C4R }).map((_, r) => { const v = g[r][c]; return (<div key={r} style={{ aspectRatio: "1", borderRadius: "50%", background: v === "R" ? "#ff5e7e" : v === "Y" ? "#f5c84b" : "#1a1530" }} />); })}
        </div>))}
      </div>
    </div>
    <div style={{ color: over ? "#4ade80" : T.sub, fontSize: 12.5, fontWeight: 600, marginTop: 12, minHeight: 16 }}>{status}</div>
    <button onClick={reset} style={btn}>New game</button>
  </>);
}

/* ---------------- CHECKERS (you=red bottom, bot=black top) ---------------- */
const ckInit = () => { const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = { s: "b", k: false };
  for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = { s: "r", k: false }; return b; };
const ckDirs = (p) => p.k ? [[-1,-1],[-1,1],[1,-1],[1,1]] : p.s === "r" ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
function ckPieceMoves(b, r, c) { const p = b[r][c]; if (!p) return { moves: [], jumps: [] }; const moves = [], jumps = [];
  for (const [dr, dc] of ckDirs(p)) { const nr = r + dr, nc = c + dc; if (!inB(nr, nc)) continue;
    if (!b[nr][nc]) moves.push({ to: [nr, nc] }); else if (b[nr][nc].s !== p.s) { const jr = r + 2 * dr, jc = c + 2 * dc; if (inB(jr, jc) && !b[jr][jc]) jumps.push({ to: [jr, jc], cap: [nr, nc] }); } } return { moves, jumps }; }
function ckApply(b, from, to, cap) { const nb = b.map((row) => row.map((x) => x ? { ...x } : null)); const p = nb[from[0]][from[1]]; nb[from[0]][from[1]] = null; if (cap) nb[cap[0]][cap[1]] = null;
  if (p.s === "r" && to[0] === 0) p.k = true; if (p.s === "b" && to[0] === 7) p.k = true; nb[to[0]][to[1]] = p; return nb; }
function ckAll(b, side) { const out = []; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = b[r][c]; if (p && p.s === side) { const { moves, jumps } = ckPieceMoves(b, r, c); for (const j of jumps) out.push({ from: [r, c], ...j, jump: true }); for (const m of moves) out.push({ from: [r, c], ...m, jump: false }); } } return out; }
function ckBotTurn(b) { let moves = ckAll(b, "b"); if (!moves.length) return b; const jumps = moves.filter((m) => m.jump); let mv = pick(jumps.length ? jumps : moves); let nb = ckApply(b, mv.from, mv.to, mv.cap);
  if (mv.jump) { let cur = mv.to; while (true) { const { jumps: js } = ckPieceMoves(nb, cur[0], cur[1]); if (!js.length) break; const j = pick(js); nb = ckApply(nb, cur, j.to, j.cap); cur = j.to; } } return nb; }
function Checkers({ say, friendName, onWin }) {
  const [b, setB] = useState(ckInit); const [sel, setSel] = useState(null); const [opts, setOpts] = useState([]); const [status, setStatus] = useState("You're red — tap a piece."); const [over, setOver] = useState(false); const chainRef = useRef(false);
  const eq = (a, x) => a && x && a[0] === x[0] && a[1] === x[1];
  const endIf = (nb) => { const r = ckAll(nb, "r").length, bl = ckAll(nb, "b").length;
    if (bl === 0) { setOver(true); setStatus("You win — all my pieces gone!"); say("your friend captured ALL your checkers pieces and won", "You cleaned me out! GG 👏"); if (onWin) onWin("You"); return true; }
    if (r === 0) { setOver(true); setStatus("I win — you're out of pieces!"); say("you captured all your friend's checkers pieces and won", "Wiped the board! 😏"); if (onWin) onWin(friendName || "Rico"); return true; } return false; };
  const botGo = (nb) => { const after = ckBotTurn(nb); setB(after); if (endIf(after)) return; setStatus("Your move."); if (Math.random() < 0.5) say("mid-game in checkers, your turn", "Your move. 👀"); };
  const tap = (r, c) => { if (over) return; const p = b[r][c];
    if (sel) { const o = opts.find((m) => eq(m.to, [r, c])); if (o) { let nb = ckApply(b, sel, o.to, o.cap);
        if (o.cap) { const { jumps } = ckPieceMoves(nb, o.to[0], o.to[1]); if (jumps.length) { setB(nb); setSel(o.to); setOpts(jumps); chainRef.current = true; setStatus("Keep jumping!"); say("your friend is on a multi-jump capture streak in checkers", "Whoa, combo! 😳"); return; } }
        setB(nb); setSel(null); setOpts([]); chainRef.current = false; if (endIf(nb)) return; setStatus("Thinking…"); if (o.cap) say("your friend just captured one of your checkers", "Hey, my piece! 😤"); setTimeout(() => botGo(nb), 600); return; }
      if (!chainRef.current && p && p.s === "r") { const { moves, jumps } = ckPieceMoves(b, r, c); setSel([r, c]); setOpts([...jumps, ...moves]); return; }
      return; }
    if (p && p.s === "r") { const { moves, jumps } = ckPieceMoves(b, r, c); if (!moves.length && !jumps.length) return; setSel([r, c]); setOpts([...jumps, ...moves]); } };
  const reset = () => { setB(ckInit()); setSel(null); setOpts([]); setOver(false); chainRef.current = false; setStatus("You're red — tap a piece."); say("starting a fresh game of checkers", "Rematch! 🔴"); };
  return (<>
    <div style={{ width: "min(88vw, 360px)", aspectRatio: "1", display: "grid", gridTemplateColumns: "repeat(8,1fr)", borderRadius: 12, overflow: "hidden", border: `1px solid ${T.line}`, boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}>
      {b.map((row, r) => row.map((cell, c) => { const light = (r + c) % 2 === 0; const isSel = eq(sel, [r, c]); const isOpt = opts.some((m) => eq(m.to, [r, c]));
        return (<div key={`${r}-${c}`} onClick={() => tap(r, c)} style={{ position: "relative", background: isSel ? T.violet : light ? "#ded3ef" : "#6f5d99", display: "flex", alignItems: "center", justifyContent: "center", cursor: over ? "default" : "pointer" }}>
          {cell && <div style={{ width: "72%", height: "72%", borderRadius: "50%", background: cell.s === "r" ? "radial-gradient(circle at 35% 30%, #ff8aa3, #d63d5f)" : "radial-gradient(circle at 35% 30%, #4a4458, #15101f)", border: "2px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffd95e", fontSize: "min(4.5vw,20px)" }}>{cell.k ? "♛" : ""}</div>}
          {isOpt && <span style={{ position: "absolute", width: "30%", height: "30%", borderRadius: "50%", background: `${T.pink}cc` }} />}
        </div>); }))}
    </div>
    <div style={{ color: over ? "#4ade80" : T.sub, fontSize: 12.5, fontWeight: 600, marginTop: 10, minHeight: 16 }}>{status}</div>
    <button onClick={reset} style={btn}>New game</button>
  </>);
}

/* ---------------- multiplayer crew helper (you + up to 3 AI friends) ---------------- */
function crew(players, friendName) {
  const base = ["Mila", "Theo", "Rae", "Kai", "Nova"];
  const src = (players && players.length) ? players.slice(0, 3) : (friendName ? [friendName] : []);
  const out = src.slice(); let bi = 0;
  while (out.length < 3) { if (!out.includes(base[bi])) out.push(base[bi]); bi++; }
  return ["You", ...out];
}

/* ---------------- LUDO (4 players: you + AI friends, classic rules) ---------------- */
const d6 = () => Math.floor(Math.random() * 6) + 1;
const LCOL = ["#ff5e7e", "#8b5cf6", "#f5c84b", "#2dd4bf"]; // P0 you, P1 agent, P2, P3
const LOOP = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],
  [6,0],
];
const LSTART = [0, 13, 26, 39];
const LSAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);
const LHOME = [
  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
];
const LYARD2 = [
  [[2,2],[2,3],[3,2],[3,3]],
  [[2,11],[2,12],[3,11],[3,12]],
  [[11,11],[11,12],[12,11],[12,12]],
  [[11,2],[11,3],[12,2],[12,3]],
];
const lkey = (r,c) => r + "," + c;
const LOOPMAP = (() => { const m = {}; LOOP.forEach(([r,c],i) => { m[lkey(r,c)] = i; }); return m; })();
const HOMEMAP = (() => { const m = {}; LHOME.forEach((arr,p) => arr.forEach(([r,c],k) => { if (k < 5) m[lkey(r,c)] = p; })); return m; })();
const STARTCOLOR = (() => { const m = {}; LSTART.forEach((idx,p) => { m[idx] = p; }); return m; })();
const lquad = (r,c) => (r<=5&&c<=5)?0:(r<=5&&c>=9)?1:(r>=9&&c>=9)?2:(r>=9&&c<=5)?3:-1;
function tokenCoord(p, pos, t) {
  if (pos === -1) return LYARD2[p][t];
  if (pos <= 50) return LOOP[(LSTART[p] + pos) % 52];
  return LHOME[p][pos - 51];
}
function legalLudo(tokens, p, d) { const out = [];
  for (let t = 0; t < 4; t++) { const pos = tokens[p][t]; if (pos === 56) continue;
    if (pos === -1) { if (d === 6) out.push(t); } else if (pos + d <= 56) out.push(t); }
  return out; }
function applyLudo(tokens, p, t, d) { const nt = tokens.map((a) => a.slice());
  const pos = tokens[p][t]; const np = pos === -1 ? 0 : pos + d; nt[p][t] = np; let captured = false;
  if (np <= 50) { const lidx = (LSTART[p] + np) % 52;
    if (!LSAFE.has(lidx)) for (let op = 0; op < 4; op++) if (op !== p) for (let ot = 0; ot < 4; ot++) {
      const o = tokens[op][ot]; if (o >= 0 && o <= 50 && (LSTART[op] + o) % 52 === lidx) { nt[op][ot] = -1; captured = true; } } }
  return { nt, captured, finished: np === 56 }; }
const ludoWin = (tokens, p) => tokens[p].every((x) => x === 56);
function aiPickLudo(tokens, p, d, lm) { let best = lm[0], bestS = -1;
  for (const t of lm) { const { captured, finished } = applyLudo(tokens, p, t, d); const pos = tokens[p][t];
    let s = pos === -1 ? 1 : pos; if (finished) s += 1000; if (captured) s += 500; if (pos === -1 && d === 6) s += 40;
    if (s > bestS) { bestS = s; best = t; } } return best; }

function Ludo({ say, friendName, players, onWin }) {
  const names = crew(players, friendName);
  const init = () => [[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1]];
  const [tokens, setTokens] = useState(init); const tokRef = useRef(tokens);
  const setTok = (nt) => { tokRef.current = nt; setTokens(nt); };
  const [turn, setTurn] = useState(0); const [dice, setDice] = useState(null);
  const [phase, setPhase] = useState("roll"); const [winner, setWinner] = useState(null);
  const [msg, setMsg] = useState("Your turn — roll the dice! 🎲"); const lock = useRef(false);
  const reset = () => { lock.current = false; setTok(init()); setTurn(0); setDice(null); setPhase("roll"); setWinner(null); setMsg("Your turn — roll the dice! 🎲"); say("starting a fresh game of Ludo with the whole crew", "New game! May the best friend win 🎲"); };
  const finish = (p) => { setWinner(p); setPhase("over");
    if (p === 0) { setMsg("🎉 You won!"); say("your friend just WON the whole game of Ludo, getting all four tokens home", "You won it all! Incredible 🏆"); if (onWin) onWin("You"); }
    else { setMsg(`${names[p]} won this one!`); say(`${names[p]} just won the game of Ludo — playfully congratulate your friend on a good game anyway`, `${names[p]} takes it! GG all 🎲`); if (onWin) onWin(names[p]); } };
  const endTurn = (p) => { setDice(null); setPhase("roll"); const np = (p + 1) % 4; setTurn(np);
    setMsg(np === 0 ? "Your turn — roll! 🎲" : `${names[np]}'s turn…`); };
  // human roll
  const roll = () => { if (winner || turn !== 0 || phase !== "roll") return; const d = d6(); setDice(d);
    const lm = legalLudo(tokRef.current, 0, d);
    if (!lm.length) { setMsg(d === 6 ? "Rolled a 6 but nothing to move 😅" : `Rolled ${d} — no moves`); setTimeout(() => endTurn(0), 850); }
    else { setPhase("move"); setMsg(`You rolled ${d} — tap a token`); } };
  const tapToken = (t) => { if (winner || turn !== 0 || phase !== "move") return;
    if (!legalLudo(tokRef.current, 0, dice).includes(t)) return;
    const { nt, captured, finished } = applyLudo(tokRef.current, 0, 0 + t, dice); setTok(nt);
    if (captured) say("your friend just landed on and sent one of the AI players' tokens back to start in Ludo", "Sent you home! 😏");
    else if (finished) say("your friend just got one of their tokens safely all the way home in Ludo", "One home! 🥳");
    if (ludoWin(nt, 0)) return finish(0);
    if (dice === 6) { setDice(null); setPhase("roll"); setMsg("Six! Roll again 🎲"); }
    else endTurn(0); };
  // AI driver
  useEffect(() => { if (winner) return; if (turn === 0) return; if (phase !== "roll") return; if (lock.current) return;
    lock.current = true;
    const p = turn;
    const rollOnce = () => { const d = d6(); setDice(d); setMsg(`${names[p]} rolled ${d}`);
      setTimeout(() => { const tk = tokRef.current; const lm = legalLudo(tk, p, d);
        if (lm.length) { const t = aiPickLudo(tk, p, d, lm); const { nt, captured, finished } = applyLudo(tk, p, t, d); setTok(nt);
          if (captured) say(`${names[p]} just captured one of your tokens in Ludo and sent it back to start`, `${names[p]} got you! 😈`);
          else if (finished) say(`${names[p]} just got a token home in Ludo`, `${names[p]} scores! 🎯`);
          if (ludoWin(nt, p)) { lock.current = false; return finish(p); }
          if (d === 6) { setTimeout(rollOnce, 750); return; } }
        setTimeout(() => { lock.current = false; endTurn(p); }, 650);
      }, 720); };
    setTimeout(rollOnce, 550);
  }, [turn, phase, winner]); // eslint-disable-line
  // render
  const occ = {}; for (let p = 0; p < 4; p++) for (let t = 0; t < 4; t++) { const [r,c] = tokenCoord(p, tokens[p][t], t); (occ[lkey(r,c)] = occ[lkey(r,c)] || []).push({ p, t }); }
  const movable = (winner == null && turn === 0 && phase === "move") ? legalLudo(tokens, 0, dice) : [];
  const cells = []; for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
    const q = lquad(r, c); let bg = "transparent"; let dot = false;
    const center = r >= 6 && r <= 8 && c >= 6 && c <= 8;
    if (q >= 0) bg = LCOL[q] + "26";
    else if (center) { bg = (r===7&&c===6)?LCOL[0]:(r===6&&c===7)?LCOL[1]:(r===7&&c===8)?LCOL[2]:(r===8&&c===7)?LCOL[3]:"#241b3d"; }
    else if (HOMEMAP[lkey(r,c)] != null) bg = LCOL[HOMEMAP[lkey(r,c)]] + "88";
    else { const li = LOOPMAP[lkey(r,c)]; if (STARTCOLOR[li] != null) { bg = LCOL[STARTCOLOR[li]]; } else { bg = "#efeaff"; dot = LSAFE.has(li); } }
    const here = occ[lkey(r,c)] || [];
    cells.push(<div key={`${r}-${c}`} style={{ position: "relative", background: bg, borderRight: c<14?"1px solid rgba(20,12,30,0.10)":"none", borderBottom: r<14?"1px solid rgba(20,12,30,0.10)":"none", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {here.length > 0 && <div onClick={() => { if (here[0].p === 0 && movable.includes(here[0].t)) tapToken(here[0].t); }} style={{ width: "74%", height: "74%", borderRadius: "50%", background: `radial-gradient(circle at 34% 30%, #ffffffcc, ${LCOL[here[0].p]})`, border: movable.includes(here[0].t) && here[0].p === 0 ? "2.5px solid #fff" : "1.5px solid rgba(0,0,0,0.35)", boxShadow: movable.includes(here[0].t) && here[0].p === 0 ? "0 0 0 3px rgba(255,255,255,0.5)" : "0 2px 4px rgba(0,0,0,0.4)", cursor: (here[0].p === 0 && movable.includes(here[0].t)) ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "min(2.4vw,11px)", fontWeight: 800, color: "#160e26" }}>{here.length > 1 ? here.length : ""}</div>}
      {dot && here.length === 0 && <span style={{ position: "absolute", fontSize: "min(2.6vw,12px)", opacity: 0.45 }}>★</span>}
    </div>);
  }
  return (<>
    <div style={{ display: "flex", gap: 8, marginBottom: 9, flexWrap: "wrap", justifyContent: "center" }}>
      {names.map((n, p) => { const home = tokens[p].filter((x) => x === 56).length;
        return <span key={p} style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: turn === p && !winner ? LCOL[p] : T.panel2, color: turn === p && !winner ? "#160e26" : LCOL[p], border: `1px solid ${LCOL[p]}66` }}>{n} · {home}/4</span>; })}
    </div>
    <div style={{ width: "min(92vw, 420px)", aspectRatio: "1", display: "grid", gridTemplateColumns: "repeat(15,1fr)", borderRadius: 12, overflow: "hidden", border: `2px solid ${T.line}`, boxShadow: "0 18px 50px rgba(0,0,0,0.5)", background: "#0f0e17" }}>{cells}</div>
    <div style={{ color: winner != null ? "#4ade80" : T.sub, fontSize: 13, fontWeight: 700, marginTop: 11, minHeight: 18 }}>{msg}</div>
    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
      {!winner && turn === 0 && phase === "roll" && <button onClick={roll} style={{ ...btn, marginTop: 0, background: T.grad, border: "none", fontSize: 15, padding: "11px 26px" }}>🎲 Roll {dice ? `(${dice})` : ""}</button>}
      {(winner != null) && <button onClick={reset} style={{ ...btn, marginTop: 0 }}>New game</button>}
      {!winner && (turn !== 0 || phase === "move") && <div style={{ fontSize: 22, alignSelf: "center" }}>{dice ? ["","⚀","⚁","⚂","⚃","⚄","⚅"][dice] : "🎲"}</div>}
    </div>
    {!winner && <button onClick={reset} style={{ ...btn, fontSize: 11, padding: "6px 14px", opacity: 0.6 }}>Restart</button>}
  </>);
}

/* ---------------- DICE DASH (friendly turn-based race, you + 3 AI friends) ---------------- */
const RLEN = 30; const RCARS = ["🏎️", "🚗", "🚙", "🛻"];
function Race({ say, friendName, players, onWin }) {
  const names = crew(players, friendName);
  const [pos, setPos] = useState([0, 0, 0, 0]); const [rolls, setRolls] = useState(null);
  const [over, setOver] = useState(false); const [, setRound] = useState(0);
  const [msg, setMsg] = useState("Tap GO to floor it! 🏁");
  const go = () => { if (over) return;
    const rs = pos.map(() => { let d = d6(); return d === 6 ? d + 2 : d; }); // 6 = nitro boost
    const prevLead = pos.indexOf(Math.max(...pos));
    const np = pos.map((x, p) => Math.min(RLEN, x + rs[p])); setPos(np); setRolls(rs); setRound((r) => r + 1);
    const lead = np.indexOf(Math.max(...np));
    const done = np.map((x) => x >= RLEN); const anyDone = done.some(Boolean);
    if (anyDone) { let w = 0, bv = -1; np.forEach((x, p) => { if (x > bv) { bv = x; w = p; } }); setOver(true);
      if (w === 0) { setMsg("🏁 You win the race!"); say("your friend just won a fun car race game, crossing the finish line first", "You took the checkered flag! 🏁🏆"); if (onWin) onWin("You"); }
      else { setMsg(`🏁 ${names[w]} wins!`); say(`${names[w]} just won the friendly car race — congratulate your friend on a fun race`, `${names[w]} crosses first! Great race 🏁`); if (onWin) onWin(names[w]); }
      return; }
    if (lead !== prevLead && lead === 0) { setMsg("You're in the lead! 🔥"); if (Math.random() < 0.6) say("your friend just overtook everyone and took the lead in a fun car race", "You're out front! 😤"); }
    else if (lead !== prevLead) setMsg(`${names[lead]} takes the lead!`);
    else setMsg(rs[0] >= 6 ? "NITRO! 🚀" : "Keep going! 🏎️"); };
  const reset = () => { setPos([0,0,0,0]); setRolls(null); setOver(false); setRound(0); setMsg("Tap GO to floor it! 🏁"); say("starting a fresh friendly car race", "New race! Engines on 🏎️"); };
  return (<>
    <div style={{ width: "min(90vw, 400px)", display: "flex", flexDirection: "column", gap: 9, background: "#1a1530", padding: 12, borderRadius: 16, boxShadow: "0 18px 50px rgba(0,0,0,0.5)", border: `1px solid ${T.line}` }}>
      {pos.map((x, p) => (<div key={p}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, fontWeight: 700, color: LCOL[p], marginBottom: 3 }}>
          <span>{RCARS[p]} {names[p]}</span><span>{rolls ? `+${rolls[p]}` : ""}</span>
        </div>
        <div style={{ position: "relative", height: 22, background: "#0f0e17", borderRadius: 100, border: `1px solid ${LCOL[p]}44`, overflow: "hidden" }}>
          <div style={{ position: "absolute", right: 5, top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: 11, opacity: 0.5 }}>🏁</div>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(x / RLEN) * 100}%`, background: `linear-gradient(90deg, ${LCOL[p]}33, ${LCOL[p]}aa)`, transition: "width 0.4s cubic-bezier(.2,.8,.3,1)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${(x / RLEN) * 100}% - 11px)`, display: "flex", alignItems: "center", fontSize: 14, transition: "left 0.4s cubic-bezier(.2,.8,.3,1)" }}>{RCARS[p]}</div>
        </div>
      </div>))}
    </div>
    <div style={{ color: over ? "#4ade80" : T.sub, fontSize: 13, fontWeight: 700, marginTop: 11, minHeight: 18 }}>{msg}</div>
    {!over ? <button onClick={go} style={{ ...btn, background: T.grad, border: "none", fontSize: 15, padding: "11px 30px" }}>GO! 🏎️</button>
      : <button onClick={reset} style={btn}>Race again</button>}
    <div style={{ fontSize: 10.5, color: T.sub, marginTop: 6, opacity: 0.7 }}>Roll a 6 = NITRO boost 🚀 · first to the flag wins</div>
  </>);
}

/* ---------------- COLOR CLASH (UNO-style, you + 3 AI friends) ---------------- */
const UCOL = { R: "#ff5e7e", V: "#8b5cf6", A: "#f5c84b", T: "#2dd4bf" };
const UCOLS = ["R", "V", "A", "T"];
const UGLYPH = { skip: "⊘", rev: "⇄", "+2": "+2", wild: "★", wild4: "+4" };
const ushuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function ubuildDeck() { const d = [];
  for (const c of UCOLS) { d.push({ c, v: 0 }); for (let v = 1; v <= 9; v++) { d.push({ c, v }); d.push({ c, v }); }
    for (const a of ["skip", "rev", "+2"]) { d.push({ c, v: a }); d.push({ c, v: a }); } }
  for (let i = 0; i < 4; i++) { d.push({ c: null, v: "wild" }); d.push({ c: null, v: "wild4" }); }
  return ushuffle(d); }
const uPlayable = (card, color, topVal) => card.c === null || card.c === color || card.v === topVal;
const uLabel = (v) => (UGLYPH[v] != null ? UGLYPH[v] : String(v));
function Uno({ say, friendName, players, onWin }) {
  const names = crew(players, friendName);
  const setup = () => { const deck = ubuildDeck(); const hands = [[], [], [], []];
    for (let k = 0; k < 7; k++) for (let p = 0; p < 4; p++) hands[p].push(deck.pop());
    let top; do { top = deck.pop(); } while (top.c === null); // start on a colored card
    return { deck, hands, discard: [top], color: top.c, turn: 0, dir: 1, over: false, winner: null }; };
  const [st, setSt] = useState(setup); const stRef = useRef(st);
  const set = (s) => { stRef.current = s; setSt(s); };
  const [msg, setMsg] = useState("Your turn — play a card or draw"); const [pick, setPick] = useState(null); const lock = useRef(false);
  const top = st.discard[st.discard.length - 1];
  const reset = () => { lock.current = false; setPick(null); const s = setup(); set(s); setMsg("Your turn — play a card or draw"); say("starting a fresh game of a UNO-style card game with the crew", "New round! Match colors or numbers 🎴"); };
  const nextAfter = (s, p, card, chosenColor) => { let dir = s.dir; let color = card.c === null ? chosenColor : card.c;
    let skip = false, drawN = 0;
    if (card.v === "rev") dir = -dir; if (card.v === "skip") skip = true;
    if (card.v === "+2") { drawN = 2; skip = true; } if (card.v === "wild4") { drawN = 4; skip = true; }
    const hands = s.hands.map((h) => h.slice()); let deck = s.deck.slice();
    let np = (p + dir + 4) % 4;
    const draw = (who, n) => { for (let i = 0; i < n; i++) { if (!deck.length) deck = ushuffle(s.discard.slice(0, -1)); if (deck.length) hands[who].push(deck.pop()); } };
    if (drawN) draw(np, drawN);
    if (skip) np = (np + dir + 4) % 4;
    return { deck, hands, discard: s.discard, color, turn: np, dir, over: false, winner: null }; };
  const playCard = (s, p, idx, chosenColor) => { const card = s.hands[p][idx];
    const base = nextAfter(s, p, card, chosenColor);
    base.hands[p] = s.hands[p].filter((_, i) => i !== idx);
    base.discard = [...s.discard, card];
    if (base.hands[p].length === 0) { base.over = true; base.winner = p; }
    return base; };
  // human play
  const onCard = (idx) => { const s = stRef.current; if (s.over || s.turn !== 0 || pick) return;
    const card = s.hands[0][idx]; if (!uPlayable(card, s.color, top.v)) return;
    if (card.c === null) { setPick(idx); setMsg("Pick a color for your wild"); return; }
    finalizePlay(idx, null); };
  const finalizePlay = (idx, chosenColor) => { const s = stRef.current; const card = s.hands[0][idx];
    const ns = playCard(s, 0, idx, chosenColor); set(ns); setPick(null);
    if (ns.over) { setMsg("🎉 You won — out of cards!"); say("your friend just won the card game by playing their last card", "Out of cards — you win! 🎴🏆"); if (onWin) onWin("You"); return; }
    if (card.v === "+2" || card.v === "wild4") say(`your friend just played a draw card making ${names[ns.turn]} pick up cards`, "Draw some cards! 😏");
    setMsg(`${names[ns.turn]}'s turn…`); };
  const drawCard = () => { const s = stRef.current; if (s.over || s.turn !== 0 || pick) return;
    let deck = s.deck.slice(); if (!deck.length) deck = ushuffle(s.discard.slice(0, -1));
    const c = deck.pop(); const hands = s.hands.map((h) => h.slice()); if (c) hands[0].push(c);
    if (c && uPlayable(c, s.color, top.v)) { set({ ...s, deck, hands }); setMsg("Drew a playable card — play it or it'll pass"); return; }
    const ns = { ...s, deck, hands, turn: (0 + s.dir + 4) % 4 }; set(ns); setMsg(`${names[ns.turn]}'s turn…`); };
  // AI
  useEffect(() => { if (st.over) return; if (st.turn === 0) return; if (lock.current) return; lock.current = true;
    const p = st.turn;
    setTimeout(() => { const s = stRef.current; const hand = s.hands[p];
      let idx = hand.findIndex((c) => c.c === s.color && c.c !== null);
      if (idx < 0) idx = hand.findIndex((c) => uPlayable(c, s.color, top.v) && c.c !== null);
      if (idx < 0) idx = hand.findIndex((c) => uPlayable(c, s.color, top.v));
      if (idx >= 0) { const card = hand[idx]; let chosen = null;
        if (card.c === null) { const cnt = { R:0,V:0,A:0,T:0 }; hand.forEach((c) => { if (c.c) cnt[c.c]++; }); chosen = UCOLS.sort((a,b)=>cnt[b]-cnt[a])[0]; }
        const ns = playCard(s, p, idx, chosen); set(ns); lock.current = false;
        if (ns.over) { setMsg(`${names[p]} won this round!`); say(`${names[p]} just won the card game — congratulate your friend on a fun game`, `${names[p]} is out — GG! 🎴`); if (onWin) onWin(names[p]); return; }
        if (card.v === "+2" || card.v === "wild4") say(`${names[p]} just hit ${names[ns.turn]} with a draw card in the card game`, `${names[p]} plays dirty 😈`);
        setMsg(ns.turn === 0 ? "Your turn — play or draw" : `${names[ns.turn]}'s turn…`); return; }
      // draw
      let deck = s.deck.slice(); if (!deck.length) deck = ushuffle(s.discard.slice(0, -1));
      const c = deck.pop(); const hands = s.hands.map((h) => h.slice()); if (c) hands[p].push(c);
      let ns;
      if (c && uPlayable(c, s.color, top.v)) { const tmp = { ...s, deck, hands }; ns = playCard(tmp, p, hands[p].length - 1, c.c === null ? "R" : null); }
      else ns = { ...s, deck, hands, turn: (p + s.dir + 4) % 4 };
      set(ns); lock.current = false;
      if (ns.over) { setMsg(`${names[p]} won!`); return; }
      setMsg(ns.turn === 0 ? "Your turn — play or draw" : `${names[ns.turn]}'s turn…`);
    }, 850);
  }, [st.turn, st.over]); // eslint-disable-line
  const cardEl = (card, key, onClick, playable) => (
    <div key={key} onClick={onClick} style={{ width: 42, height: 60, flexShrink: 0, borderRadius: 8, background: card.c ? UCOL[card.c] : "linear-gradient(135deg,#ff5e7e,#8b5cf6,#2dd4bf)", border: playable ? "2.5px solid #fff" : "2px solid rgba(0,0,0,0.3)", boxShadow: playable ? "0 0 0 2px rgba(255,255,255,0.45), 0 4px 10px rgba(0,0,0,0.4)" : "0 3px 8px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: card.c === "A" ? "#160e26" : "#fff", fontWeight: 800, fontSize: card.v === "+2" || card.v === "wild4" ? 16 : 20, cursor: onClick ? "pointer" : "default", transform: playable ? "translateY(-6px)" : "none", transition: "transform 0.15s" }}>{uLabel(card.v)}</div>);
  return (<>
    <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap", justifyContent: "center" }}>
      {names.map((n, p) => (<span key={p} style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100, background: st.turn === p && !st.over ? UCOL[UCOLS[p]] : T.panel2, color: st.turn === p && !st.over ? (UCOLS[p] === "A" ? "#160e26" : "#fff") : UCOL[UCOLS[p]], border: `1px solid ${UCOL[UCOLS[p]]}66` }}>{n} · {st.hands[p].length}🎴</span>))}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9.5, color: T.sub, fontWeight: 700, marginBottom: 4 }}>ON TABLE</div>
        {cardEl(top, "top")}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 9.5, color: T.sub, fontWeight: 700, marginBottom: 4 }}>COLOR</div>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: UCOL[st.color], margin: "0 auto", border: "2px solid rgba(255,255,255,0.4)" }} />
      </div>
    </div>
    {pick !== null && <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      {UCOLS.map((c) => (<button key={c} onClick={() => finalizePlay(pick, c)} style={{ width: 34, height: 34, borderRadius: 8, background: UCOL[c], border: "2px solid rgba(255,255,255,0.5)", cursor: "pointer" }} />))}
    </div>}
    <div style={{ fontSize: 9.5, color: T.sub, fontWeight: 700, marginBottom: 5 }}>YOUR HAND</div>
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", maxWidth: "min(92vw,430px)", paddingTop: 6 }}>
      {st.hands[0].map((card, i) => { const pl = !st.over && st.turn === 0 && !pick && uPlayable(card, st.color, top.v);
        return cardEl(card, i, () => onCard(i), pl); })}
    </div>
    <div style={{ color: st.over ? "#4ade80" : T.sub, fontSize: 13, fontWeight: 700, marginTop: 12, minHeight: 18 }}>{msg}</div>
    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
      {!st.over && st.turn === 0 && !pick && <button onClick={drawCard} style={{ ...btn, marginTop: 0 }}>Draw a card</button>}
      {st.over && <button onClick={reset} style={{ ...btn, marginTop: 0 }}>New game</button>}
    </div>
    {!st.over && <button onClick={reset} style={{ ...btn, fontSize: 11, padding: "6px 14px", opacity: 0.6 }}>Restart</button>}
  </>);
}

const btn = { marginTop: 10, background: T.panel2, border: `1px solid ${T.line}`, color: T.text, fontWeight: 700, fontSize: 13, padding: "10px 22px", borderRadius: 100, cursor: "pointer", fontFamily: font };
const TITLES = { chess: "♟ Chess", ttt: "⭕ Tic-Tac-Toe", c4: "🔵 Connect 4", checkers: "🔴 Checkers", ludo: "🎲 Ludo", racing: "🏎️ Dice Dash", uno: "🎴 Color Clash" };

export default function GameBoard({ game, agent, onClose, friends, onGameEnd }) {
  const name = agent?.name || "Rico";
  const [banter, setBanter] = useState("Let's play! 🎮"); const idRef = useRef(0);
  const notifyEnd = useCallback((winnerName) => { if (onGameEnd) onGameEnd(winnerName, TITLES[game] || game); }, [onGameEnd, game]);
  const say = useCallback((situation, fallback) => { const myId = ++idRef.current; if (fallback) setBanter(fallback);
    const lang = (typeof window !== "undefined" && ((localStorage.getItem("hitony_lang") !== "auto" && localStorage.getItem("hitony_lang")) || localStorage.getItem("hitony_lang_detected"))) || "en";
    fetch("/api/banter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId: agent?.id || "tony", game, situation, language: lang }) })
      .then((r) => r.json()).then((d) => { if (d.line && myId === idRef.current) setBanter(d.line); }).catch(() => {}); }, [agent, game]);
  useEffect(() => { say(`you and your friend are starting a friendly game of ${TITLES[game] || game} — kick it off with a fun challenge`, "Let's play! 🎮"); /* eslint-disable-next-line */ }, []);
  const Game = game === "chess" ? ChessGame : game === "c4" ? Connect4 : game === "checkers" ? Checkers : game === "ludo" ? Ludo : game === "racing" ? Race : game === "uno" ? Uno : TicTacToe;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(8,7,14,0.93)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: font, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, padding: "18px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 12 }}>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 17 }}>{TITLES[game] || "Game"} <span style={{ color: T.sub, fontWeight: 600, fontSize: 13 }}>vs {name}</span></div>
          <button onClick={onClose} style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text, width: 34, height: 34, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", marginBottom: 16 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", padding: 2, background: T.grad, flexShrink: 0 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#161226", display: "flex", justifyContent: "center" }}>
              <div style={{ marginTop: 2 }}><TonyCharacter size={66} look={agent?.look || {}} float="none" animated={false} pose="down" expr="😄" /></div>
            </div>
          </div>
          <div style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 16, borderTopLeftRadius: 4, padding: "11px 15px" }}>
            <div style={{ color: T.violet, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, marginBottom: 2 }}>{name.toUpperCase()}</div>
            <div style={{ color: T.text, fontSize: 14.5, lineHeight: 1.4, fontWeight: 500 }}>{banter}</div>
          </div>
        </div>
        <Game say={say} friendName={name} players={friends} onWin={notifyEnd} />
      </div>
    </div>
  );
}
