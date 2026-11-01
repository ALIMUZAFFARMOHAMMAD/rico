import { useEffect, useRef, useState } from "react";
import s from "./Workspace.module.css";
import { MotionToggle } from "./VisualExperience";

function Avatar({ friend }) {
  return <span className={s.avatar} aria-hidden="true">{friend.avatar ? <img src={friend.avatar} alt="" /> : friend.name.slice(0, 1)}</span>;
}

export default function ChatWorkspace({ friend, friends, messages, input, onInput, onSend, onSelect, onBack, onGames, onResume, onAts, onTailor, hasResume, onReveal, canReveal, revealing, onReport, memories, busy, loadError, error, saveState, onRetry, panelRef }) {
  const [search, setSearch] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const [copyError, setCopyError] = useState("");
  const composer = useRef(null);
  const locked = busy || saveState === "saving";
  const sendDisabled = locked || loadError || saveState === "error" || !input.trim();
  useEffect(() => {
    const field = composer.current;
    if (field) { field.style.height = "auto"; field.style.height = Math.min(field.scrollHeight, 160) + "px"; }
  }, [input]);
  useEffect(() => { setCopied(null); setCopyError(""); }, [friend.id]);
  async function copy(message) {
    try { await navigator.clipboard.writeText(message.text); setCopied(message.id); setCopyError(""); }
    catch (error) { setCopyError("Copy isn’t available here. Select the message text to copy it."); }
  }
  const choosePrompt = text => { onInput(text); composer.current?.focus(); };
  return <section className={s.workspace} aria-label="Conversation workspace">
    <aside className={s.sidebar} aria-label="Conversations">
      <button className={s.brand} disabled={locked} onClick={onBack}>✳ <span>ricomates</span><small>← Back</small></button>
      <div className={s.sidebarTitle}><h2>Conversations</h2><span>{friends.length}</span></div>
      <input className={s.search} aria-label="Find a conversation" placeholder="Search conversations…" value={search} onChange={event => setSearch(event.target.value)} />
      <nav className={s.threadList} aria-label="Choose a conversation">{friends.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).map(item => <button key={item.id} disabled={locked} aria-current={friend.id === item.id ? "page" : undefined} className={s.thread} onClick={() => item.id !== friend.id && onSelect(item)}><Avatar friend={item} /><span><strong>{item.name}</strong><small>{item.isTwin ? "AI twin" : item.archetype || "AI friend"}</small></span>{item.id === friend.id && <span className={s.activeDot} />}</button>)}</nav>
      {!friends.some(item => item.name.toLowerCase().includes(search.toLowerCase())) && <p className={s.muted}>No conversations found.</p>}
      <a className={s.groupLink} href="/groups">◎ Group conversations <span>↗</span></a>
      <p className={s.sidebarFoot}>A space to think, plan, and connect.</p>
    </aside>
    <div className={s.chatColumn}>
      <header className={s.chatHeader}>
        <button className={`${s.smallButton} ${s.mobileBack}`} onClick={onBack} disabled={locked} aria-label="Back to your friends">←</button>
        <Avatar friend={friend} />
        <div className={s.identity}><h1>{friend.name}</h1><span>{friend.isTwin ? "AI twin" : "AI friend"} · Conversation</span></div>
        <a className={s.smallButton} href={`/voice?agent=${encodeURIComponent(friend.id)}`} aria-label={`Call ${friend.name}`}>Call ↗</a>
        <button className={s.smallButton} onClick={() => setToolsOpen(value => !value)} aria-expanded={toolsOpen} aria-controls="conversation-tools">Tools <span aria-hidden="true">{toolsOpen ? "−" : "+"}</span></button>
        <div className="vfx-chat-motion"><MotionToggle /></div>
      </header>
      <div className={s.chatBody}>
        <div className={s.messageColumn}>
          <div className={s.saveStatus} role="status"><span className={s.statusDot} />{saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : saveState === "error" ? "Changes not saved" : "Your conversation"}<span>Private to your account</span></div>
          {error && <div className={s.error} role="alert">{error}<button className={s.smallButton} disabled={locked} onClick={onRetry}>{loadError ? "Try loading again" : saveState === "error" ? "Retry save" : "Dismiss"}</button></div>}
          <div ref={panelRef} className={s.messages} role="log" aria-label="Conversation messages" aria-live="polite">
            <div className={s.conversationStart}><span>CONVERSATION WITH {friend.name.toUpperCase()}</span><p>Bring a question, an idea, or whatever’s on your mind.</p></div>
            {messages.map(message => <article data-vfx-reveal key={message.id} className={message.role === "user" ? s.userMessage : s.assistantMessage}>
              <div className={s.messageLabel}>{message.role === "user" ? "You" : friend.name}<span>{message.role === "user" ? "" : "AI"}</span></div>
              <div className={s.messageText}>{message.text.split(/(\*[^*]+\*)/g).map((part, index) => part.startsWith("*") && part.endsWith("*") ? <em key={index}>{part.slice(1, -1)}</em> : part)}</div>
              <div className={s.messageActions}><button onClick={() => copy(message)} aria-label={`Copy ${message.role === "user" ? "your" : friend.name + "’s"} message`}>{copied === message.id ? "Copied ✓" : "Copy"}</button>{message.role === "agent" && <button onClick={() => onReport(message)}>Report</button>}</div>
            </article>)}
            {busy && <div className={s.thinking} role="status"><span className="vfx-waveform" aria-hidden="true">{[0,1,2,3].map(bar => <i key={bar} style={{ "--bar": bar }} />)}</span>{saveState === "saving" ? "Saving your conversation…" : `${friend.name} is thinking…`}</div>}
          </div>
          {copyError && <p role="status" className={s.copyError}>{copyError}</p>}
          <div className={s.composeArea}>
            <div className={s.composer}>
              <textarea ref={composer} rows={2} value={input} maxLength={8000} disabled={loadError} aria-label={`Message ${friend.name}`} placeholder={`Message ${friend.name}…`} onChange={event => onInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!sendDisabled) onSend(); } }} />
              <div className={s.composerToolbar}><div><button onClick={onGames}>♟ <span>Games</span></button>{friend.id === "tony" && <button onClick={onResume}>＋ <span>Résumé</span></button>}</div><button className={s.send} onClick={onSend} disabled={sendDisabled} aria-label="Send message">Send ↑</button></div>
            </div>
            <div className={s.composerHint}><span>Enter to send · Shift + Enter for a new line</span><span>AI can make mistakes.</span></div>
          </div>
        </div>
        {toolsOpen && <aside className={s.toolsPanel} id="conversation-tools" aria-label="Conversation tools">
          <div className={s.toolsHeading}><h2>Tools & context</h2><button className={s.smallButton} onClick={() => setToolsOpen(false)} aria-label="Close tools">×</button></div>
          <p className={s.muted}>Make this conversation useful.</p>
          <h3>Start with a purpose</h3>
          {[["Plan my day", "Help me turn my priorities into a realistic plan for today."], ["Think it through", "Help me think through an idea. Ask me one question at a time."], ["Practice a skill", "Help me practice a skill. Ask me what I want to work on."]].map(([label, text]) => <button className={s.toolRow} key={label} onClick={() => choosePrompt(text)}>{label}<span>↗</span></button>)}
          <h3>Do more together</h3>
          <button className={s.toolRow} onClick={onGames}>Game library <span>♟</span></button>
          {friend.id === "tony" && <><button className={s.toolRow} onClick={onResume}>{hasResume ? "Update résumé" : "Share résumé"}<span>＋</span></button>{hasResume && <><button className={s.toolRow} onClick={onAts}>Check ATS score <span>↗</span></button><button className={s.toolRow} onClick={onTailor}>Tailor to a job <span>↗</span></button></>}</>}
          {canReveal && <button className={s.toolRow} onClick={onReveal} disabled={revealing}>{revealing ? "Preparing insights…" : "Personality insights"}<span>↗</span></button>}
          {!!memories.length && <><h3>Remembered context</h3><ul className={s.memories}>{memories.map(memory => <li key={memory}>{memory}</li>)}</ul></>}
          <p className={s.toolsNote}>Your messages stay in this conversation. Choose another friend from the sidebar to switch contexts.</p>
        </aside>}
      </div>
    </div>
  </section>;
}
