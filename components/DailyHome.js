import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import TonyCharacter from "./TonyCharacter";
import styles from "./DailyHome.module.css";

const MOODS = [
  { id: "bright", face: "☀", label: "Great", message: "Let's put that good energy somewhere.", action: "Make a little progress", agent: "tony", prompt: "Help me pick one small, achievable goal for today." },
  { id: "okay", face: "☺", label: "Okay", message: "An ordinary day can still have a lovely moment.", action: "Find a little inspiration", agent: "tony", prompt: "Suggest something small and interesting I could try today." },
  { id: "low", face: "☁", label: "Low", message: "You don't have to turn the whole day around.", action: "Talk it through", agent: "dev", prompt: "I'm having a low day. Can we talk for a little while?" },
  { id: "busy", face: "ϟ", label: "Busy", message: "One thing at a time. Let's make some room.", action: "Untangle my day", agent: "tony", prompt: "Help me sort my priorities and choose what to do first today." },
];
const ACTIVITIES = [
  { id: "learn", title: "Learn something", detail: "A little curiosity goes a long way.", tag: "GROW", icon: "✳", tone: "lilac", category: "Focus", href: "/classroom", action: "Open AI Tutor" },
  { id: "play", title: "Make time for fun", detail: "A quick game with your AI friends.", tag: "PLAY", icon: "♜", tone: "peach", category: "Unwind", action: "Choose a game" },
  { id: "notes", title: "Catch that thought", detail: "Turn handwritten notes into clarity.", tag: "CREATE", icon: "✎", tone: "mint", category: "Focus", href: "/notebook", action: "Open notebook" },
  { id: "translate", title: "Find the words", detail: "A little help across 11 languages.", tag: "CONNECT", icon: "◎", tone: "blue", category: "Connect", href: "/translate", action: "Open translator" },
];
const FILTERS = ["For you", "Focus", "Unwind", "Connect"];

function Arrow() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

export default function DailyHome({ userName = "", userId, friends = [], onChat, onDiscover, onPlay, onChats }) {
  const systemReduced = useReducedMotion();
  const [calm, setCalm] = useState(false);
  const [mood, setMood] = useState(null);
  const [filter, setFilter] = useState("For you");
  const [greeting, setGreeting] = useState("Hello");
  const [breathing, setBreathing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [waving, setWaving] = useState(false);
  const reduced = systemReduced || calm;
  const preferenceKey = userId ? "rico_motion_" + userId : null;

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    setMood(null);
    setCalm(false);
    if (preferenceKey) {
      try { setCalm(localStorage.getItem(preferenceKey) === "calm"); } catch (error) {}
    }
  }, [preferenceKey]);

  useEffect(() => {
    if (!breathing) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      if (elapsed >= 30) {
        setBreathing(false); setSeconds(30); setFinished(true);
      } else setSeconds(elapsed);
    }, 250);
    return () => clearInterval(interval);
  }, [breathing]);

  useEffect(() => {
    if (!waving) return;
    const timeout = setTimeout(() => setWaving(false), 2000);
    return () => clearTimeout(timeout);
  }, [waving]);

  function toggleMotion() {
    const next = !calm;
    setCalm(next);
    if (preferenceKey) {
      try { localStorage.setItem(preferenceKey, next ? "calm" : "full"); } catch (error) {}
    }
  }

  const visibleActivities = ACTIVITIES.filter(item => filter === "For you" || item.category === filter);
  const heroFriend = friends.find(friend => friend.id === "tony") || friends[0];
  const enter = reduced ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
  const lift = reduced ? {} : { whileHover: { y: -4 }, whileTap: { scale: 0.98 } };
  const breathLabel = seconds % 10 < 4 ? "Breathe in" : "Breathe out";

  return (
    <main className={styles.home} data-calm={reduced ? "true" : "false"} aria-label="Your daily space">
      <div className={styles.topline}>
        <span className={styles.eyebrow}><span className={styles.sun}>✳</span> YOUR DAILY DOSE OF GOOD</span>
        <button type="button" className={styles.motionToggle} onClick={toggleMotion} aria-pressed={calm} title={systemReduced ? "Your device's reduced motion setting is respected" : "Toggle gentle motion"}>
          <span aria-hidden="true">{reduced ? "◌" : "≈"}</span> {reduced ? "Calm motion" : "Motion on"}
        </button>
      </div>

      <motion.section {...enter} className={styles.hero} aria-labelledby="daily-title">
        <div className={styles.heroCopy}>
          <span className={styles.hello}>{greeting}{userName ? ", " + userName : ""} <span aria-hidden="true">↗</span></span>
          <h1 id="daily-title">A little more<br /><em>you-time.</em></h1>
          <p>A place to think out loud, try something new, or just be yourself.</p>
          <button type="button" className={styles.heroCta} onClick={() => onChat?.(heroFriend?.id || "tony", "")}>Let's talk <Arrow /></button>
          <span className={styles.aiLabel}>Your AI friends. Your kind of day.</span>
        </div>
        <div className={styles.heroArt}>
          <div className={styles.orbit} aria-hidden="true" />
          <span className={styles.sparkOne} aria-hidden="true">✳</span>
          <span className={styles.sparkTwo} aria-hidden="true">✦</span>
          <span className={styles.sticker}>come as you are</span>
          <button type="button" className={styles.characterButton} onClick={() => setWaving(true)} aria-label="Wave to Tony">
            <span aria-hidden="true"><TonyCharacter size={240} look={heroFriend?.look || {}} animated={!reduced} float="none" pose={waving ? "wave" : "down"} emote={!reduced && waving ? "wave" : "none"} expr={mood?.id === "bright" ? "😄" : "😊"} /></span>
          </button>
          <span className={styles.waveCaption} role="status">{waving ? "Hey, you! 👋" : "tap to say hi"}</span>
        </div>
      </motion.section>

      <section className={styles.moodSection} aria-labelledby="mood-heading">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>FIRST, A LITTLE CHECK-IN</span><h2 id="mood-heading">How's your world today?</h2></div>
          <span className={styles.optional}>Just for this visit</span>
        </div>
        <div className={styles.moods} role="group" aria-label="How are you feeling?">
          {MOODS.map(item => (
            <motion.button {...lift} type="button" key={item.id} aria-pressed={mood?.id === item.id} className={styles.mood} data-selected={mood?.id === item.id} onClick={() => setMood(mood?.id === item.id ? null : item)}>
              <span aria-hidden="true" className={styles.moodFace}>{item.face}</span><span>{item.label}</span><span className={styles.moodCheck} aria-hidden="true">{mood?.id === item.id ? "✓" : "+"}</span>
            </motion.button>
          ))}
        </div>
        <AnimatePresence initial={false} mode="wait">
          {mood && <motion.div key={mood.id} initial={reduced ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={styles.moodResponse}>
            <p role="status">{mood.message}</p><button type="button" onClick={() => onChat?.(mood.agent, mood.prompt)}>{mood.action} <Arrow /></button>
          </motion.div>}
        </AnimatePresence>
      </section>

      <div className={styles.sectionHeading}>
        <div><span className={styles.eyebrow}>GOOD COMPANY, ONE TAP AWAY</span><h2>Your inner circle <span className={styles.headingDot}>●</span></h2></div>
        <button type="button" className={styles.textButton} onClick={onDiscover}>Meet more <Arrow /></button>
      </div>
      <div className={styles.friends} aria-label="Your AI friends">
        {friends.slice(0, 6).map((friend, index) => (
          <motion.button {...lift} type="button" className={styles.friend} key={friend.id} onClick={() => onChat?.(friend.id, "")} style={{ "--friend-color": friend.look?.hoodie || "#cabafa" }}>
            <div className={styles.friendPortrait} aria-hidden="true">
              {friend.avatar ? <img src={friend.avatar} alt="" /> : <TonyCharacter size={108} look={friend.look || {}} animated={false} float="none" pose="down" />}
              <span className={styles.friendBadge}>{["✦", "☀", "☁", "✳", "♡", "◎"][index]}</span>
            </div>
            <strong>{friend.name}</strong><span className={styles.friendRole}>{friend.isTwin ? "AI twin" : (friend.archetype || "AI friend").replace(/^The /, "")}</span>
          </motion.button>
        ))}
        {friends.length < 3 && <button type="button" className={styles.inviteCard} onClick={onDiscover}><span>＋</span><strong>Find your people</strong><small>A personality for every side of you</small></button>}
      </div>

      <section className={styles.activities} aria-labelledby="activities-heading">
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>SMALL MOMENTS, BETTER DAYS</span><h2 id="activities-heading">What sounds good?</h2></div>
        </div>
        <div className={styles.filters} role="group" aria-label="Filter activities">
          {FILTERS.map(item => <button type="button" key={item} onClick={() => setFilter(item)} aria-pressed={filter === item} className={filter === item ? styles.activeFilter : ""}>{item}</button>)}
        </div>
        <div className={styles.activityGrid}>
          {visibleActivities.map(item => {
            const content = <><div className={styles.cardTop}><span className={styles.cardTag}>{item.tag}</span><span className={styles.activityIcon} aria-hidden="true">{item.icon}</span></div><h3>{item.title}</h3><p>{item.detail}</p><span className={styles.cardAction}>{item.action}<Arrow /></span></>;
            return item.href
              ? <motion.a {...lift} key={item.id} href={item.href} className={styles.activityCard} data-tone={item.tone}>{content}</motion.a>
              : <motion.button {...lift} type="button" key={item.id} onClick={onPlay} className={styles.activityCard} data-tone={item.tone}>{content}</motion.button>;
          })}
          {filter === "Connect" && <motion.a {...lift} href="/groups" className={styles.activityCard} data-tone="peach"><div className={styles.cardTop}><span className={styles.cardTag}>TOGETHER</span><span className={styles.activityIcon} aria-hidden="true">♡</span></div><h3>Bring the circle together</h3><p>Start a conversation with a few AI friends.</p><span className={styles.cardAction}>Open group chats<Arrow /></span></motion.a>}
        </div>
      </section>

      <section className={styles.breathe} aria-labelledby="breathe-heading">
        <div className={styles.breathOrb} data-breathing={breathing} aria-hidden="true"><span>✳</span></div>
        <div className={styles.breatheCopy}><span className={styles.eyebrow}>A MOMENT FOR YOU</span><h2 id="breathe-heading">{breathing ? breathLabel : finished ? "A little space. Just for you." : "Pause. Exhale. Reset."}</h2><p>{breathing ? (30 - seconds) + " seconds left · at your own pace" : finished ? "Take that softer pace into your day." : "Take a 30-second breather. Nothing to finish."}</p></div>
        <button type="button" className={styles.breatheButton} onClick={() => { setSeconds(0); setFinished(false); setBreathing(!breathing); }}>{breathing ? "Stop" : finished ? "Again?" : "Take a breath"}{!breathing && <Arrow />}</button>
        <span className={styles.srOnly} role="status">{finished ? "Your breathing break is complete." : ""}</span>
      </section>
      <footer className={styles.footer}><span>✦ A little connection goes a long way.</span><button type="button" onClick={onChats}>Pick up a conversation <Arrow /></button></footer>
    </main>
  );
}
