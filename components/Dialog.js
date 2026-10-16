import { useEffect, useRef } from "react";
import styles from "./SocialUI.module.css";

export default function Dialog({ title, onClose, busy = false, wide = false, children }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const panel = ref.current;
    panel.focus();
    const handleKey = (event) => {
      if (event.key === "Escape" && !busy) close.current();
      if (event.key !== "Tab") return;
      const controls = [...panel.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, audio[controls], [tabindex="0"]')].filter(element => !element.matches(":disabled") && element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); panel.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
    };
    panel.addEventListener("keydown", handleKey);
    return () => { panel.removeEventListener("keydown", handleKey); previous?.focus?.(); };
  }, [busy]);
  return <div className={styles.backdrop} onClick={() => !busy && onClose()}>
    <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={styles.dialog} data-wide={wide || undefined} onClick={event => event.stopPropagation()}>
      <header className={styles.row}><h2>{title}</h2><button className={styles.iconButton} aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button></header>
      {children}
    </section>
  </div>;
}
