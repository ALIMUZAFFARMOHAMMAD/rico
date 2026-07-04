import { SignUp } from "@clerk/nextjs";
export default function SignUpPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#090813", padding: "32px 16px", gap: 18 }}>
      <SignUp appearance={{ variables: { colorPrimary: "#7c4fcd", colorBackground: "#13131c", colorText: "#f0eeff", colorInputBackground: "#0e0e12", colorInputText: "#f0eeff" } }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#13131c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, padding: "8px 16px", fontSize: 12, color: "#a7a3b8", maxWidth: 420, textAlign: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <span>🤖 AI clearly labeled</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>🔒 You control your data</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>💛 No romance, no manipulation</span>
      </div>
      <a href="/landing#trust" style={{ fontSize: 11.5, color: "#7c4fcd", textDecoration: "none" }}>Why we built Rico honest by design →</a>
    </div>
  );
}
