import { SignUp } from "@clerk/nextjs";
import AuthShell, { authAppearance } from "../../components/AuthShell";

export default function AuthPage() {
  return <AuthShell signup><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" afterSignUpUrl="/" appearance={authAppearance} /></AuthShell>;
}
