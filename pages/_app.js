import { ClerkProvider } from '@clerk/nextjs'
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
          const external = /^https?:\/\//i.test(href) && !/hitony\.vercel\.app/i.test(href);
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

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider {...pageProps}>
      <NativeBridge />
      <DirManager />
      <StatusBanner />
      <Component {...pageProps} />
    </ClerkProvider>
  )
}
