import { useEffect, useState } from "react";
import { ClerkFailed, ClerkLoaded, ClerkLoading, SignIn, SignUp } from "@clerk/nextjs";
import { authAppearance } from "./AuthShell";
import s from "./AuthShell.module.css";

function LoadingForm() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, []);
  return <div className={s.loading} role="status">
    <strong>{slow ? "Sign-in is taking longer than usual." : "Opening secure sign-in…"}</strong>
    <p>{slow ? "Check your connection, then try reloading the form." : "Your account will be ready in a moment."}</p>
    {slow && <button className={s.retry} onClick={() => window.location.reload()}>Reload sign-in</button>}
  </div>;
}

export default function AuthForm({ signup = false }) {
  return <div className={s.authForm}>
    <ClerkLoading><LoadingForm /></ClerkLoading>
    <ClerkFailed><div className={s.loading} role="alert"><strong>We couldn’t connect to sign-in.</strong><p>Please check your connection and try again.</p><button className={s.retry} onClick={() => window.location.reload()}>Reload sign-in</button></div></ClerkFailed>
    <ClerkLoaded>{signup
      ? <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/" appearance={authAppearance} fallback={<LoadingForm />} />
      : <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/" appearance={authAppearance} fallback={<LoadingForm />} />}
    </ClerkLoaded>
    <p className={s.recovery}>Stuck on a verification step? <a href={signup ? "/sign-up" : "/sign-in"}>Restart {signup ? "sign-up" : "sign-in"}</a></p>
  </div>;
}
