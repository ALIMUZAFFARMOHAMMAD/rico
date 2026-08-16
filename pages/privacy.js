import Head from "next/head";

const T = { bg: "#0f0e17", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)" };
const font = "'Inter',system-ui,-apple-system,sans-serif";

function H({ children }) { return <div style={{ color: T.text, fontWeight: 700, fontSize: 15, margin: "20px 0 7px" }}>{children}</div>; }
function P({ children }) { return <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.65, marginBottom: 8 }}>{children}</div>; }

export default function Privacy() {
  return (<>
    <Head><title>Privacy Policy — Rico</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 680, padding: "22px 20px 60px" }}>
        <a href="/" style={{ color: T.text, textDecoration: "none", fontSize: 18 }}>←</a>
        <div style={{ fontSize: 26, fontWeight: 900, background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 10 }}>Privacy Policy</div>
        <P>Last updated: 16 June 2026</P>
        <P>This explains what we collect, why, and the control you have. We aim to collect only what's needed to run Rico. We do not sell your personal data or share it for cross-context behavioural advertising.</P>

        <H>1. Who handles your data</H>
        <P>The operator of Rico is the data controller. We use trusted processors to run the service: a sign-in provider (Clerk), a database/host (Supabase, Vercel), an AI provider for replies and analysis (Anthropic), and a voice provider for text-to-speech and voice cloning (ElevenLabs). Each only receives what's needed for its function.</P>

        <H>2. What we collect</H>
        <P>• <b style={{ color: T.text }}>Account</b>: your name and email from the sign-in provider.</P>
        <P>• <b style={{ color: T.text }}>Conversations</b>: the messages you send, the AI replies, and a short personality read the AI forms from them.</P>
        <P>• <b style={{ color: T.text }}>Calls</b>: brief text notes summarising voice calls (so your friends "remember" you). We do not retain call audio.</P>
        <P>• <b style={{ color: T.text }}>Matches & reports</b>: who you've connected with, and any content you report.</P>
        <P>• <b style={{ color: T.text }}>Your twin</b>: the AI persona derived from your conversations, if you create one.</P>

        <H>3. Voice cloning</H>
        <P>If you choose to clone a voice, the recording is sent to our voice provider to create a voice model that your twin uses. You must only clone your own voice. You can delete the cloned voice at any time, which removes it from the provider. We do not use your voice for anything other than your twin.</P>

        <H>4. Photo to avatar</H>
        <P>If you make an avatar from a photo, the image is sent once to the AI provider to estimate avatar colours and is <b style={{ color: T.text }}>not stored</b> by us. Only the resulting colour values are saved. We do <b style={{ color: T.text }}>not</b> perform facial recognition and do not create or store any biometric identifier from your photo. Please upload only photos of yourself.</P>

        <H>5. Why we use it</H>
        <P>To operate core features (generate replies, build your twin, run calls and matching), to keep the service safe (handle reports, prevent abuse), and to remember you across sessions. We do not sell your personal data or use it for third-party advertising.</P>

        <H>6. Your controls & rights</H>
        <P>• <b style={{ color: T.text }}>Memory Vault</b> lets you view and delete what each agent remembers, or make an agent forget you entirely.</P>
        <P>• You can retire your twin and remove your cloned voice anytime.</P>
        <P>• You may request access to, correction of, or full deletion of your data, and (where applicable under GDPR/CCPA) object to or restrict processing and request portability. Contact the operator via the in-app support contact.</P>

        <H>7. Retention</H>
        <P>We keep your data while your account is active. When you delete content or your account, we remove it from our systems and instruct our processors to do the same, subject to limited legal retention requirements.</P>

        <H>8. Security</H>
        <P>Sign-in is handled by a dedicated provider; secrets are stored server-side and never exposed to your browser. No system is perfectly secure, but we take reasonable measures to protect your data.</P>

        <H>9. Younger users</H>
        <P>Rico is for users aged 13 and over. We do not knowingly collect data from anyone under 13; if you believe a child under 13 has used Rico, contact us and we will delete their data. If you are between 13 and the age of digital consent in your country, you need a parent or guardian's permission to use Rico, and they may contact us to review or delete your data.</P>

        <H>10. International transfers</H>
        <P>Our processors (including Anthropic, ElevenLabs, Clerk, Supabase, and Vercel) may process your data in countries other than your own, including the United States. Where required by law, we rely on appropriate safeguards such as the EU Standard Contractual Clauses for these transfers.</P>

        <H>11. Changes</H>
        <P>If we materially change this policy, we'll ask you to review and accept the update in the app.</P>

        <div style={{ marginTop: 24, display: "flex", gap: 14 }}>
          <a href="/terms" style={{ color: "#8b5cf6", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Terms of Service →</a>
          <a href="/" style={{ color: T.sub, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Back to Rico</a>
        </div>
      </div>
    </div>
    <style>{`*{box-sizing:border-box;margin:0;padding:0;}html,body{background:${T.bg};}`}</style>
  </>);
}
