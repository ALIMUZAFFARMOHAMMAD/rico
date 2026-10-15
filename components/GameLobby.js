import { useState } from "react";
import Dialog from "./Dialog";
import s from "./SocialUI.module.css";

export default function GameLobby({ games, friend, onStart, onClose, busy }) {
  const [filter, setFilter] = useState("All games");
  return <Dialog title="A little time to play" onClose={onClose}>
    <p className={s.muted}>Playing with {friend.name} · {friend.isTwin ? "AI twin" : "AI friend"}. Pick a board or start a conversation game.</p>
    <div className={s.filters}>{["All games","Board games","Conversation games"].map(item => <button className={s.filter} key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
    {busy && <p role="status" className={s.notice}>Getting your conversation ready…</p>}
    <div className={s.gameGrid}>{games.filter(game => filter === "All games" || (filter === "Board games" ? game.board : !game.board)).map(game => <button key={game.key} className={s.game} disabled={busy && !game.board} onClick={() => onStart(game)}><span aria-hidden="true">{game.icon}</span><strong>{game.label}</strong><small>{game.board ? "Interactive board · Play now" : "Take turns in your chat"}</small></button>)}</div>
  </Dialog>;
}
