import AuthForm from "../../components/AuthForm";
import AuthShell from "../../components/AuthShell";

export default function AuthPage() {
  return <AuthShell signup><AuthForm signup /></AuthShell>;
}
