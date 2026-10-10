// Public account-deletion page — the in-app "Delete account" row links here, and it is the
// "Delete account URL" for the Google Play listing. Signed out: explains what is deleted
// and offers sign-in. Signed in: one confirmed button → DELETE /api/account.
import { useState } from "react";
import Head from "next/head";
import { useUser, useClerk, SignInButton } from "@clerk/nextjs";

const C = { bg: "#0f0e17", card: "#1a1826", line: "rgba(255,255,255,0.09)", text: "#f5f3ff", sub: "#a9a5c0", red: "#f87171", cta: "#d6365e" };
const font = "'DM Sans',system-ui,-apple-system,sans-serif";
const btn = { border: "none", color: "#fff", fontWeight: 700, fontSize: 15, height: 48, padding: "0 28px", borderRadius: 100, cursor: "pointer", fontFamily: font };

export default function DeleteAccount() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [state, setState] = useState("idle"); // idle | busy | done | error
  const [err, setErr] = useState("");

  async function del() {
    if (!window.confirm("Delete your Rico account and all your data? This can't be undone.")) return;
    setState("busy");
    const r = await fetch("/api/account", { method: "DELETE" }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { setErr(d.error || "Something went wrong — please try again."); setState("error"); return; }
    try { localStorage.clear(); } catch (e) {}
    setState("done");
    signOut().catch(() => {});
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: font, display: "flex", justifyContent: "center", padding: "48px 16px" }}>
      <Head><title>Delete your account — ricomates</title></Head>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <a href="/" style={{ color: C.sub, textDecoration: "none", fontSize: 14 }}>← Back to Rico</a>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 32, margin: "20px 0 12px" }}>Delete your account</h1>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, padding: 20, lineHeight: 1.6, fontSize: 15, color: C.sub }}>
          Deleting your Rico account permanently removes:
          <ul style={{ margin: "10px 0", paddingLeft: 20 }}>
            <li>your sign-in account and email</li>
            <li>all chats and what every AI friend remembers about you</li>
            <li>your AI twin, its profile, and your cloned voice</li>
            <li>your matches, notebook, résumé profile and activity stats</li>
          </ul>
          Deletion happens immediately. We don't keep backups of deleted accounts.
        </div>

        <div style={{ marginTop: 24 }}>
          {state === "done" ? (
            <p style={{ color: C.text, fontSize: 16 }}>✓ Your account and data have been deleted. Take care 💛</p>
          ) : !isLoaded ? null : isSignedIn ? (
            <>
              <p style={{ fontSize: 14, color: C.sub }}>Signed in as {user.primaryEmailAddress?.emailAddress}</p>
              <button onClick={del} disabled={state === "busy"} style={{ ...btn, background: C.red, opacity: state === "busy" ? 0.6 : 1 }}>
                {state === "busy" ? "Deleting…" : "Delete my account"}
              </button>
              {state === "error" && <p style={{ color: C.red, fontSize: 14 }}>{err}</p>}
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: C.sub }}>Sign in to the account you want to delete.</p>
              <SignInButton mode="modal" afterSignInUrl="/delete-account"><button style={{ ...btn, background: C.cta }}>Sign in</button></SignInButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
