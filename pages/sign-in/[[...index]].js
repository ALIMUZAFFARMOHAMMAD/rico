import { SignIn } from "@clerk/nextjs";
import AuthShell, { authAppearance } from "../../components/AuthShell";

export default function AuthPage() {
  return <AuthShell><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/" appearance={authAppearance} /></AuthShell>;
}
