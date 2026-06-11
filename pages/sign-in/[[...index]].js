import { SignIn } from "@clerk/nextjs";
export default function SignInPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#090813" }}>
      <SignIn appearance={{ variables: { colorPrimary: "#7c4fcd", colorBackground: "#13131c", colorText: "#f0eeff", colorInputBackground: "#0e0e12", colorInputText: "#f0eeff" } }} />
    </div>
  );
}
