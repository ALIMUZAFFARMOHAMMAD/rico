import { ClerkProvider } from '@clerk/nextjs'
import Head from 'next/head'
import { useEffect } from 'react'
import { getStoredLang, isRTL } from '../lib/i18n'
import StatusBanner from '../components/StatusBanner'
import '../styles/globals.css'

// Flip the document to right-to-left when the active language is RTL (Arabic).
function DirManager() {
  useEffect(() => {
    const apply = () => {
      try {
        const l = getStoredLang();
        document.documentElement.dir = isRTL(l) ? 'rtl' : 'ltr';
        document.documentElement.lang = l;
      } catch (e) {}
    };
    apply();
    window.addEventListener('rico-lang', apply);
    window.addEventListener('storage', apply);
    return () => { window.removeEventListener('rico-lang', apply); window.removeEventListener('storage', apply); };
  }, []);
  return null;
}

// When Rico runs inside the native (Capacitor) app, open external links — including
// Google's OAuth pages — in the system browser. Embedded webviews are blocked by
// Google ("disallowed_useragent"), so the secure system browser is required.
function NativeBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cap = window.Capacitor;
    if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;
    let cleanup;
    (async () => {
      try {
        const { Browser } = await import('@capacitor/browser');
        const onClick = (e) => {
          const a = e.target && e.target.closest && e.target.closest('a[href]');
          if (!a) return;
          const href = a.href || '';
          // ponytail: our own domains stay in the webview — opening /sign-in in the system browser
          // signs the user in THERE, never in the app (the "can't sign in on phone" bug).
          const external = /^https?:\/\//i.test(href) && !/^https:\/\/([a-z0-9-]+\.)*ricomates\.si(\/|$)/i.test(href);
          if (external || a.target === '_blank') {
            e.preventDefault();
            Browser.open({ url: href, presentationStyle: 'popover' }).catch(() => {});
          }
        };
        document.addEventListener('click', onClick, true);
        cleanup = () => document.removeEventListener('click', onClick, true);
      } catch (e) {}
    })();
    return () => { if (cleanup) cleanup(); };
  }, []);
  return null;
}

// Clerk's __session cookie lives ~60s and clerk-js refreshes it on a timer — timers freeze
// while a phone tab/webview is backgrounded, so the first API call after coming back hit the
// middleware with a stale cookie → 401 (calls showed "Couldn't connect", replies fell back to
// "Say that again?", premium voice silently fell back to the robot voice). Attach a fresh token
// (getToken() refreshes only when expired) to every same-origin /api/ request instead.
// ponytail: patches window.fetch once for all callers rather than threading useAuth() through ~20 call sites
function FreshApiToken() {
  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : '';
      const session = window.Clerk && window.Clerk.session;
      if (url.startsWith('/api/') && session) {
        try {
          const t = await session.getToken();
          if (t) { const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${t}`); init = { ...init, headers }; }
        } catch (e) {}
      }
      return orig(input, init);
    };
    return () => { window.fetch = orig; };
  }, []);
  return null;
}

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider {...pageProps} signInUrl="/sign-in" signUpUrl="/sign-up">
      <Head><link rel="icon" href="/favicon.svg" type="image/svg+xml" /><link rel="apple-touch-icon" href="/favicon.svg" /></Head>
      <NativeBridge />
      <FreshApiToken />
      <DirManager />
      <StatusBanner />
      <Component {...pageProps} />
    </ClerkProvider>
  )
}
