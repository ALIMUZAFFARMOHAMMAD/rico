import Head from "next/head";
import TonyCharacter from "./TonyCharacter";
import s from "./AuthShell.module.css";

export const authAppearance = {
  variables: { colorPrimary: "#7046a3", colorBackground: "#ffffff", colorText: "#30263b", colorTextSecondary: "#71677c", colorInputBackground: "#faf8fd", colorInputText: "#30263b", borderRadius: "14px", fontFamily: "'DM Sans', sans-serif" },
  elements: { card: { boxShadow: "none", border: "1px solid #eee7f3", width: "100%", maxWidth: 420 }, rootBox: { width: "100%", maxWidth: 420 }, footerActionLink: { color: "#7046a3" } },
};

export default function AuthShell({ children, signup = false }) {
  return <main className={s.shell}>
    <Head><title>{signup ? "Join" : "Welcome back to"} Ricomates</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
    <section className={s.story}>
      <a className={s.logo} href="/landing">✳ ricomates</a>
      <div><span className={s.tag}>A little company. A lot of possibility.</span><h1>Your day feels<br />better connected.</h1><p>Talk it out. Play a round. Learn something new.<br />Make a little space for yourself.</p></div>
      <div className={s.scene}><div className={s.bubble}>Hey, you. What’s on your mind? ✨</div><TonyCharacter size={230} look={{ hoodie: "#8b5cf6", hoodieD: "#7146d1" }} float="none" animated={false} pose="down" /></div>
      <div className={s.pills}><span>AI friends & twins</span><span>Conversations & calls</span><span>Games & groups</span></div>
    </section>
    <section className={s.form}><div className={s.heading}><span className={s.tag}>{signup ? "Your circle starts here" : "Make yourself at home"}</span><h2>{signup ? "Meet your next hello." : "Good to have you back."}</h2><p>{signup ? "Create an account to keep your conversations together." : "Sign in to pick up where you left off."}</p></div>{children}<p className={s.privacy}>AI friends and twins are clearly labeled. Manage your data and voice from your profile.</p><nav className={s.links} aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/landing">Back to home</a></nav></section>
  </main>;
}
