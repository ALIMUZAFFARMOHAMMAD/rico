import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { IDENTITY_LIMITS } from "../lib/twin-identity";
import s from "../components/TwinStudio.module.css";

const TABS = [{ id: "identity", title: "Shape your twin", icon: "✳" }, { id: "rehearse", title: "Rehearse", icon: "◌" }, { id: "discuss", title: "Twin circle", icon: "◎" }, { id: "create", title: "Create together", icon: "↗" }];
const FIELDS = [
  ["name", "What should we call your twin?", "Your name"],
  ["style", "How do you sound?", "I'm direct, warm, and a little playful. I use short sentences and ask thoughtful questions."],
  ["values", "What matters to you?", "Curiosity, showing up for friends, keeping promises…"],
  ["knowledge", "Facts your twin may share", "Only add information you approve for conversations. Keep passwords, private client information and other people's secrets out."],
  ["boundaries", "Where should your twin pause?", "Ask me before making plans. Don't speak about my family or promise deadlines."],
  ["examples", "Give it a few lines that sound like you", "Paste your own phrases or short answers. Your twin uses these as style examples."],
];
const IDEAS = {
  rehearse: ["Someone asks what I enjoy working on. How would I answer?", "A colleague asks me to commit to Friday. What should my twin say?"],
  discuss: ["Plan a relaxed weekend together. Let each twin suggest something different.", "Debate whether a great friend should always agree with you."],
  create: ["A funny reel about friends trying to agree on one game to play.", "A warm 25-second reel about making time for your friends."],
};
async function studio(body) {
  const response = await fetch("/api/twin-studio", { ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Your twin couldn't connect. Try again.");
  return data;
}
export default function TwinStudio() {
  const { isLoaded, isSignedIn, user } = useUser();
  const session = useRef({ active: false });
  const [data, setData] = useState(null), [profile, setProfile] = useState(null), [tab, setTab] = useState("identity");
  const [prompt, setPrompt] = useState(""), [partners, setPartners] = useState([]), [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [consent, setConsent] = useState(false);
  useEffect(() => {
    const token = { active: true };
    session.current = token;
    setData(null); setProfile(null); setResult(null); setPrompt(""); setPartners([]); setConsent(false); setError(""); setNotice(""); setBusy(false);
    if (!isSignedIn) return;
    let active = true;
    studio().then(next => { if (active) { setData(next); setProfile(next.profile); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; token.active = false; };
  }, [isSignedIn, user?.id]);
  const dirty = !!profile && JSON.stringify(profile) !== JSON.stringify(data?.profile);
  async function run(task) { const current = session.current; const active = () => current.active && current === session.current; setBusy(true); setError(""); setNotice(""); try { await task(active); } catch (e) { if (active()) setError(e.message); } finally { if (active()) setBusy(false); } }
  async function save(event) {
    event.preventDefault();
    await run(async active => { await studio({ action: "save", profile, revision: data.revision, consent }); if (!active()) return; const next = await studio(); if (!active()) return; setData(next); setProfile(next.profile); setNotice("Saved. Your twin now uses this approved identity."); });
  }
  function changeTab(id) { setTab(id); setResult(null); setPrompt(""); setError(""); setNotice(""); }
  function togglePartner(id) { setPartners(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id].slice(0, 2)); }
  function download() {
    const blob = new Blob([`Ricomates · AI-generated ${result.kind}\n${result.generatedAt}\n\n${result.output}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `ricomates-${result.kind}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className={s.page}>
    <Head><title>Twin Studio · Ricomates</title><meta name="description" content="Shape your AI twin's character, rehearse together and create with other AI personalities." /></Head>
    <header className={s.topbar}><a href="/" className={s.brand}>rico<span>mates</span><i>✳</i></a><nav aria-label="Studio navigation"><a href="/meetings">Meetings</a><a href="/groups">Play & chat</a><a href="/">Back home ↗</a></nav></header>
    <main className={s.main}>
      <section className={s.hero}>
        <div><div className={s.eyebrow}><span /> YOUR PERSONALITY, MORE POSSIBILITIES</div><h1>A little more <em>you.</em><br />A whole new world.</h1><p>Shape a twin that sounds like you, knows what you choose to share, and brings your character into the conversation.</p><div className={s.tags}><span>✳ Your character</span><span>◎ Your boundaries</span><span>↗ Your creative circle</span></div></div>
        <div className={s.art} aria-hidden="true"><div className={s.orbit} /><div className={s.orbitTwo} /><div className={s.core}>✳</div><span className={s.bubbleOne}>same energy.</span><span className={s.bubbleTwo}>new possibilities ↗</span><span className={s.spark}>✦</span></div>
      </section>
      <div className={s.layout}>
        <section className={s.workspace} aria-label="Twin Studio">
          <div className={s.tabs} aria-label="Studio sections">{TABS.map(item => <button key={item.id} type="button" aria-pressed={tab === item.id} className={tab === item.id ? s.selectedTab : ""} disabled={busy} onClick={() => changeTab(item.id)}><span>{item.icon}</span>{item.title}</button>)}</div>
          <div className={s.panel}>
            {error && <div role="alert" className={s.error}>{error} {!data && isSignedIn && <button onClick={() => run(async active => { const next = await studio(); if (active()) { setData(next); setProfile(next.profile); } })}>Try again</button>}</div>}
            {notice && <p className={s.notice} role="status">{notice}</p>}
            {!isLoaded ? <p role="status">Opening your studio…</p> : !isSignedIn ? <div className={s.welcome}><h2>Make yourself at home.</h2><p>Sign in to create your twin, control its personality and try a conversation.</p><a className={s.primary} href="/sign-in?redirect_url=%2Ftwin-studio">Open my studio ↗</a></div> : !profile ? <p role="status">Loading your twin…</p> : tab === "identity" ? <form onSubmit={save}>
              <div className={s.sectionTitle}><div><span className={s.kicker}>01 / THE PERSON BEHIND THE TWIN</span><h2>It starts with you.</h2></div><span className={s.pill}>{profile.discoverable ? "Community twin" : "Private twin"}</span></div>
              <p className={s.muted}>Your twin learns from these approved details across chats, games and meeting drafts. You can change them whenever you like.</p>
              <div className={s.fields}>{FIELDS.map(([key, label, placeholder]) => <label key={key} className={key === "name" ? s.nameField : ""}><span>{label}</span>{key === "name" ? <input disabled={busy} value={profile[key] || ""} required maxLength={IDENTITY_LIMITS[key]} placeholder={placeholder} onChange={e => setProfile({ ...profile, [key]: e.target.value })} /> : <textarea disabled={busy} value={profile[key] || ""} required={key === "style"} rows={key === "knowledge" ? 4 : 3} maxLength={IDENTITY_LIMITS[key]} placeholder={placeholder} onChange={e => setProfile({ ...profile, [key]: e.target.value })} />}<small>{(profile[key] || "").length}/{IDENTITY_LIMITS[key]}</small></label>)}</div>
              <label className={s.check}><input type="checkbox" disabled={busy} checked={profile.discoverable} onChange={e => setProfile({ ...profile, discoverable: e.target.checked })} /><span><b>Let others meet my AI twin</b><small>Shares this personality and approved facts for new AI conversations and creative drafts. Your cloned voice remains yours to use. Previously shared outputs cannot be recalled.</small></span></label>
              <label className={s.check}><input type="checkbox" disabled={busy} checked={consent} onChange={e => setConsent(e.target.checked)} required /><span>This is my own identity, and I approve the information above for my twin to use.</span></label>
              <div className={s.footer}><button className={s.primary} disabled={busy || !consent}>{busy ? "Saving…" : "Save my twin ↗"}</button><span>Always introduced as your AI twin.</span></div>
            </form> : <div>
              <span className={s.kicker}>{tab === "rehearse" ? "02 / DOES THIS SOUND LIKE YOU?" : tab === "discuss" ? "03 / GOOD COMPANY" : "04 / MAKE SOMETHING TOGETHER"}</span>
              <h2>{tab === "rehearse" ? "Meet your other voice." : tab === "discuss" ? "Let personalities meet." : "From a spark to a story."}</h2>
              <p className={s.muted}>{tab === "rehearse" ? "Try a question before your twin represents you. Review the answer and refine your profile." : tab === "discuss" ? "Generate a discussion between AI characters and shared twins. Their human owners are not participating live." : "Create a reel script with dialogue, scenes and a caption. Review and export it to your video editor."}</p>
              {dirty && <p className={s.notice}>Save your profile changes in Shape your twin before generating.</p>}
              {tab !== "rehearse" && <fieldset className={s.partners}><legend>Invite AI personalities <span>up to 2</span></legend>{data.partners.map(a => <button type="button" key={a.id} aria-pressed={partners.includes(a.id)} disabled={busy || (!partners.includes(a.id) && partners.length >= 2)} onClick={() => togglePartner(a.id)}><span>{a.isTwin ? "◎" : "✦"}</span>{a.name}<small>{a.isTwin ? "AI twin" : "AI character"}</small></button>)}</fieldset>}
              <label className={s.promptLabel} htmlFor="studio-prompt">{tab === "rehearse" ? "What would someone ask you?" : "What are we making space for?"}</label>
              <textarea id="studio-prompt" className={s.prompt} rows={4} maxLength={2000} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={IDEAS[tab][0]} />
              <div className={s.ideas}>{IDEAS[tab].map(idea => <button type="button" key={idea} disabled={busy} onClick={() => setPrompt(idea)}>↗ {idea}</button>)}</div>
              <button className={s.primary} disabled={busy || dirty || !data.hasTwin || !data.aiReady || !prompt.trim() || (tab === "discuss" && !partners.length)} onClick={() => run(async active => { setResult(null); const next = await studio({ action: tab, prompt, partnerIds: tab === "rehearse" ? [] : partners }); if (active()) setResult(next); })}>{busy ? "Your twin is thinking…" : tab === "create" ? "Create a reel script ↗" : tab === "discuss" ? "Start the AI discussion ↗" : "Try my twin ↗"}</button>
              {!data.hasTwin && <p className={s.muted}>Save your identity first to bring your twin to life.</p>}{!data.aiReady && <p className={s.notice}>AI generation needs the app's AI service. Profile editing remains available.</p>}
              <small className={s.cost}>Uses the app's configured AI service. Results can be inaccurate; review before sharing.</small>
              {result && <article className={s.result} aria-live="polite"><div className={s.resultHeading}><b>✳ {tab === "create" ? "Your creative draft" : "Your twin, in words"}</b><span>AI GENERATED</span></div><div className={s.output}>{result.output}</div><div className={s.footer}><button className={s.secondary} onClick={download}>Export text ↓</button><button className={s.secondary} onClick={() => run(async active => { await navigator.clipboard.writeText(result.output); if (active()) setNotice("Copied. Keep the AI disclosure when sharing."); })}>Copy</button><button className={s.textButton} onClick={() => { changeTab("identity"); setNotice("Refine your style and examples, then rehearse again."); }}>Refine my twin →</button></div></article>}
            </div>}
          </div>
        </section>
        <aside className={s.sidebar}>
          <div className={s.sideCard}><span className={s.kicker}>YOUR TWIN, OUT IN THE WORLD</span><h3>Bring your energy.</h3><a className={s.destination} href="/meetings"><span>↗</span><div><b>Meeting companion</b><small>Prepare, capture and review replies</small></div></a><a className={s.destination} href="/groups"><span>♜</span><div><b>Game night & chat</b><small>Play with the app's AI friends</small></div></a><div className={s.connection}><b>Discord</b><span>Integration pending</span><p>A dedicated Discord bot needs an application and connected server.</p></div><div className={s.connection}><b>Among Us & PUBG</b><span>Not connected</span><p>External multiplayer control is not available in this release.</p></div></div>
          <div className={s.promise}><span>◎</span><h3>Your twin.<br />Your say.</h3><p>You choose what it knows and shares. It should say when it doesn't know, and leave personal commitments to you.</p><small>Personality is an approximation, not a copy of your mind.</small></div>
          <div className={s.voice}><span>◖◗</span><div><b>{data?.voiceCloned ? "Your voice is saved" : "Make it sound like you"}</b><p>{data?.voiceCloned ? "Your cloned voice is reserved for your signed-in use." : "Add your own voice recording from the You tab."}</p><a href="/">Open voice settings →</a></div></div>
        </aside>
      </div>
    </main><footer className={s.bottom}>Made for more human connections. <span>Ricomates · Twin Studio</span></footer>
  </div>;
}
