import { useRef, useState } from "react";
import Dialog from "./Dialog";
import { GAME_GUIDE } from "../lib/game-guide";
import s from "./Workspace.module.css";

export default function GameLobby({ games, friend, onStart, onClose, busy }) {
  const [filter, setFilter] = useState("All games");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(games[0]?.key);
  const detail = useRef(null);
  const visible = games.filter(game => (filter === "All games" || (filter === "Board games" ? game.board : !game.board)) && game.label.toLowerCase().includes(query.toLowerCase()));
  const selected = visible.find(game => game.key === selection) || visible[0];
  const guide = GAME_GUIDE[selected?.key] || {};
  return <Dialog title="Game library" onClose={onClose} wide>
    <div className={s.library}>
      <div className={s.libraryHeader}><p>A purposeful break.<br />Play a board game or explore a conversation with {friend.name}.</p><input className={s.search} value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a game…" aria-label="Search games" /></div>
      <div className={s.libraryLayout}>
        <div><div className={s.categories} aria-label="Game categories">{["All games", "Board games", "Conversation games"].map(item => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
          <p className={s.muted}>{visible.length} {visible.length === 1 ? "game" : "games"} · Choose one to see details</p>
          <div className={s.gameGrid}>{visible.map(game => <button key={game.key} className={s.gameCard} aria-pressed={selected?.key === game.key} aria-controls="game-details" onClick={() => { setSelection(game.key); if (window.matchMedia("(max-width: 720px)").matches) detail.current?.scrollIntoView({ behavior: "auto", block: "nearest" }); }}><span aria-hidden="true">{game.icon}</span><strong>{game.label}</strong><small>{GAME_GUIDE[game.key]?.category || "Conversation"} · {GAME_GUIDE[game.key]?.time || "At your pace"}</small></button>)}</div>
          {!visible.length && <div className={s.libraryEmpty}>No games match “{query}”. <button className={s.smallButton} onClick={() => { setQuery(""); setFilter("All games"); }}>Show all games</button></div>}
        </div>
        {selected && <aside ref={detail} id="game-details" className={s.gameDetail} aria-label="Selected game"><span className={s.meta}>{selected.board ? "Interactive board" : "Conversation game"}</span><span className={s.detailIcon} aria-hidden="true">{selected.icon}</span><h3>{selected.label}</h3><p>{guide.description}</p><dl><dt>Playing with</dt><dd>{friend.name} · AI</dd><dt>Typical session</dt><dd>{guide.time || "At your pace"}</dd></dl><p>{selected.board ? guide.rules : "Opens in your conversation. Take turns by sending messages."}</p><button className={s.launch} disabled={busy && !selected.board} onClick={() => onStart(selected)}>{selected.board ? "Start game" : "Start in chat"} <span aria-hidden="true">↗</span></button>{busy && !selected.board && <p role="status">Your conversation must be ready and saved before starting.</p>}</aside>}
      </div>
    </div>
  </Dialog>;
}
