import { SignUp } from "@clerk/nextjs";
export default function SignUpPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#090813" }}>
      <SignUp appearance={{ variables: { colorPrimary: "#7c4fcd", colorBackground: "#13131c", colorText: "#f0eeff", colorInputBackground: "#0e0e12", colorInputText: "#f0eeff" } }} />
    </div>
  );
}
