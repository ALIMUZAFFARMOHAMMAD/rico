import Head from "next/head";

const T = { bg: "#0f0e17", line: "rgba(255,255,255,0.1)", text: "#f5f3ff", sub: "#9b97b0", grad: "linear-gradient(135deg,#ff5e7e 0%,#8b5cf6 100%)" };
const font = "'Inter',system-ui,-apple-system,sans-serif";

function H({ children }) { return <div style={{ color: T.text, fontWeight: 700, fontSize: 15, margin: "20px 0 7px" }}>{children}</div>; }
function P({ children }) { return <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.65, marginBottom: 8 }}>{children}</div>; }

export default function Terms() {
  return (<>
    <Head><title>Terms of Service — Rico</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: font, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 680, padding: "22px 20px 60px" }}>
        <a href="/" style={{ color: T.text, textDecoration: "none", fontSize: 18 }}>←</a>
        <div style={{ fontSize: 26, fontWeight: 900, background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 10 }}>Terms of Service</div>
        <P>Last updated: 16 June 2026</P>

        <H>1. What Rico is</H>
        <P>Rico is an entertainment and companionship service where you chat and voice-call with AI characters ("agents") and AI "twins." Every agent, twin, and voice is artificial intelligence and is labelled as AI within the app, in line with AI-transparency requirements (including the EU AI Act). There are no real humans on the other side of any conversation. AI responses are generated automatically and may be inaccurate, fictional, or offensive despite our safeguards — do not rely on them as fact or advice.</P>

        <H>2. Eligibility</H>
        <P>You must be at least 13 years old to use Rico. If you are under the age of digital consent in your country (for example, under 16 in parts of the EU), you may only use Rico with the permission of a parent or guardian. By using the service you confirm that you meet these requirements and are able to agree to these terms.</P>

        <H>3. Not professional advice</H>
        <P>Rico is not a substitute for professional medical, mental-health, legal, financial, or other advice, and is not an emergency or crisis service. If you are in distress or danger, contact a qualified professional or your local emergency number immediately.</P>

        <H>4. Your account</H>
        <P>You are responsible for activity under your account and for keeping your sign-in secure. You agree to provide accurate information and not to impersonate anyone.</P>

        <H>5. Acceptable use</H>
        <P>You agree not to: harass, abuse, or harm others; submit hateful, sexual-exploitative, or illegal content; attempt to make agents produce harmful or illegal output; upload another person's voice or photo without their consent; scrape, reverse-engineer, or overload the service; or use Rico to deceive others. We may suspend or remove access for misuse. Each agent message includes a report control — please use it.</P>

        <H>6. AI Twins</H>
        <P>A "twin" is an AI version of you, created from your conversations, that other users may chat and call with. You are responsible for what your conversations teach your twin. Do not include other people's private information. You can refresh or retire your twin at any time, which removes it from discovery.</P>

        <H>7. Voice and photo features</H>
        <P>If you clone a voice, you confirm it is your own and consent to its use by your twin on calls with people who match it. If you create an avatar from a photo, you confirm it is a photo of you. You can remove a cloned voice at any time. See our Privacy Policy for how this data is handled.</P>

        <H>8. User content & licence</H>
        <P>You keep ownership of what you submit. You grant us a limited licence to process your content to operate the service (e.g., generate replies, form your twin, run features you enable). We do not sell your personal content.</P>

        <H>9. Disclaimers</H>
        <P>The service is provided "as is" and "as available," without warranties of any kind. We do not warrant that AI output is accurate, appropriate, or uninterrupted.</P>

        <H>10. Limitation of liability</H>
        <P>To the maximum extent permitted by law, Rico and its operators are not liable for any indirect, incidental, or consequential damages, or for how you act on AI-generated content. Our total liability is limited to the amount you paid us in the prior 12 months (which may be zero).</P>

        <H>11. Changes</H>
        <P>We may update these terms. If we make material changes, we will ask you to accept the new version. Continued use after changes means you accept them.</P>

        <H>12. Governing law & disputes</H>
        <P>These terms are governed by the laws of the State of Missouri, United States, without regard to its conflict-of-laws rules, and you agree to the exclusive jurisdiction of its courts, except where mandatory local consumer-protection law gives you other rights that cannot be waived. If any provision is found unenforceable, the rest remain in effect.</P>

        <H>13. Contact</H>
        <P>Questions about these terms, or to exercise your rights or request deletion of your data, contact the operator through the support contact provided in the app.</P>

        <div style={{ marginTop: 24, display: "flex", gap: 14 }}>
          <a href="/privacy" style={{ color: "#8b5cf6", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Privacy Policy →</a>
          <a href="/" style={{ color: T.sub, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Back to Rico</a>
        </div>
      </div>
    </div>
    <style>{`*{box-sizing:border-box;margin:0;padding:0;}html,body{background:${T.bg};}`}</style>
  </>);
}
