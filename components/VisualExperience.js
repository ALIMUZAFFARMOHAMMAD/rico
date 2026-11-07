import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig, useReducedMotion } from "framer-motion";
import { useRouter } from "next/router";

const VisualContext = createContext({ reduced: true, calm: false, systemReduced: false, toggleMotion: () => {} });
const STORAGE_KEY = "rico_visual_motion";
export const useVisualMotion = () => useContext(VisualContext);

export function VisualExperience({ children }) {
  const systemReduced = useReducedMotion();
  const [calm, setCalm] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const router = useRouter();
  const reduced = !ready || !!systemReduced || calm;
  useEffect(() => {
    try { setCalm(localStorage.getItem(STORAGE_KEY) === "calm"); } catch {}
    setReady(true);
    const visibility = () => setVisible(!document.hidden);
    const storage = e => { if (e.key === STORAGE_KEY) setCalm(e.newValue === "calm"); };
    visibility(); document.addEventListener("visibilitychange", visibility); window.addEventListener("storage", storage);
    return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("storage", storage); };
  }, []);
  const toggleMotion = useCallback(() => setCalm(previous => {
    const next = !previous;
    try { localStorage.setItem(STORAGE_KEY, next ? "calm" : "full"); } catch {}
    return next;
  }), []);
  useEffect(() => {
    document.documentElement.dataset.visualMotion = reduced ? "calm" : "full";
    document.documentElement.dataset.visualVisible = visible ? "true" : "false";
    return () => { delete document.documentElement.dataset.visualMotion; delete document.documentElement.dataset.visualVisible; };
  }, [reduced, visible]);
  useEffect(() => {
    const start = () => setNavigating(true), stop = () => setNavigating(false);
    router.events.on("routeChangeStart", start); router.events.on("routeChangeComplete", stop); router.events.on("routeChangeError", stop);
    return () => { router.events.off("routeChangeStart", start); router.events.off("routeChangeComplete", stop); router.events.off("routeChangeError", stop); };
  }, [router.events]);
  const value = useMemo(() => ({ reduced, calm, systemReduced: !!systemReduced, toggleMotion, visible }), [reduced, calm, systemReduced, toggleMotion, visible]);
  const authPage = /^\/sign-(in|up)/.test(router.pathname);
  return <VisualContext.Provider value={value}><MotionConfig reducedMotion={reduced ? "always" : "user"}>
    <RevealObserver reduced={reduced} />
    {navigating && <div className="vfx-route-progress" role="status" aria-label="Opening page" />}
    {children}
    {!authPage && <MotionToggle floating />}
  </MotionConfig></VisualContext.Provider>;
}

export function MotionToggle({ floating = false }) {
  const { reduced, calm, systemReduced, toggleMotion } = useVisualMotion();
  return <button type="button" className={`vfx-motion-toggle${floating ? " vfx-motion-floating" : ""}`} aria-label={systemReduced ? "Reduced motion follows your device setting" : calm ? "Turn visual effects on" : "Pause visual effects"} aria-pressed={!reduced} disabled={systemReduced} onClick={toggleMotion} title={systemReduced ? "Your device requests reduced motion" : "Motion preference applies across Ricomates"}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{reduced ? <><path d="M9 6v12M15 6v12" /><circle cx="12" cy="12" r="10" /></> : <><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)" /><circle cx="12" cy="12" r="3" /><circle cx="20" cy="6" r="2" fill="currentColor" /></>}</svg>
    <span>{systemReduced ? "Device calm" : reduced ? "Calm mode" : "Effects on"}</span>
  </button>;
}

// Progressive enhancement: content is visible even if observers or animation fail.
function RevealObserver({ reduced }) {
  const seen = useRef(new WeakSet());
  useEffect(() => {
    if (reduced || !window.IntersectionObserver || !Element.prototype.animate) return;
    const animations = new Set();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (seen.current.has(entry.target)) continue;
        seen.current.add(entry.target);
        const delay = Math.min(5, Number(entry.target.dataset.vfxOrder) || 0) * 55;
        const animation = entry.target.animate([{ opacity: 0.25, translate: "0 18px" }, { opacity: 1, translate: "0 0" }], { duration: 620, delay, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
        animations.add(animation); animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: 0.08 });
    const watch = node => {
      if (!(node instanceof Element)) return;
      if (node.matches("[data-vfx-reveal]") && !seen.current.has(node)) observer.observe(node);
      node.querySelectorAll("[data-vfx-reveal]").forEach(element => { if (!seen.current.has(element)) observer.observe(element); });
    };
    watch(document.body);
    const mutations = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(watch)));
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutations.disconnect(); animations.forEach(animation => animation.cancel()); };
  }, [reduced]);
  return null;
}

export function Atmosphere({ fixed = false, quiet = false }) {
  const { reduced, visible } = useVisualMotion();
  const canvas = useRef(null);
  useEffect(() => {
    if (reduced || !visible || !canvas.current) return;
    const element = canvas.current, parent = element.parentElement;
    const context = element.getContext("2d");
    if (!context) return;
    let width = 0, height = 0, frame = 0, last = 0, inView = false;
    const pointer = { x: -2000, y: -2000 };
    let particles = [];
    const resize = () => {
      width = parent.clientWidth; height = Math.min(parent.clientHeight, 1000);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      element.width = width * ratio; element.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = width < 700 ? 18 : quiet ? 28 : 44;
      particles = Array.from({ length: count }, (_, i) => ({ x: ((i * 137.508) % 997) / 997 * width, y: ((i * 293.17) % 991) / 991 * height, phase: i * 1.8, radius: i % 5 === 0 ? 2 : 1 }));
    };
    const draw = time => {
      if (!inView) return;
      frame = requestAnimationFrame(draw);
      if (time - last < 33) return;
      last = time; context.clearRect(0, 0, width, height);
      const points = particles.map(p => {
        let x = p.x + Math.sin(time * .00012 + p.phase) * 22, y = p.y + Math.cos(time * .00016 + p.phase) * 18;
        const distance = Math.hypot(x - pointer.x, y - pointer.y);
        if (distance < 150 && distance > 1) { x += (x - pointer.x) / distance * 10; y += (y - pointer.y) / distance * 10; }
        return { x, y, radius: p.radius };
      });
      points.forEach((point, i) => {
        context.fillStyle = i % 3 === 0 ? "rgba(249,183,221,.7)" : "rgba(187,204,255,.55)";
        context.beginPath(); context.arc(point.x, point.y, point.radius, 0, Math.PI * 2); context.fill();
        for (let j = i + 1; j < points.length; j++) {
          const other = points[j], distance = Math.hypot(point.x - other.x, point.y - other.y);
          if (distance > 100) continue;
          context.strokeStyle = `rgba(178,154,255,${(1 - distance / 100) * .16})`;
          context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(other.x, other.y); context.stroke();
        }
      });
    };
    const move = event => { const rect = parent.getBoundingClientRect(); pointer.x = event.clientX - rect.left; pointer.y = event.clientY - rect.top; };
    const leave = () => { pointer.x = pointer.y = -2000; };
    const observer = new ResizeObserver(resize); observer.observe(parent); resize();
    const intersection = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; cancelAnimationFrame(frame); if (inView) frame = requestAnimationFrame(draw); }); intersection.observe(parent);
    const target = fixed ? window : parent.parentElement;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (finePointer) { target.addEventListener("pointermove", move, { passive: true }); target.addEventListener("pointerleave", leave); }
    return () => { cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); target.removeEventListener("pointermove", move); target.removeEventListener("pointerleave", leave); context.clearRect(0, 0, width, height); };
  }, [reduced, visible, quiet, fixed]);
  return <div className={`vfx-atmosphere${fixed ? " vfx-fixed" : ""}${quiet ? " vfx-quiet" : ""}`} aria-hidden="true"><div className="vfx-aurora vfx-aurora-one" /><div className="vfx-aurora vfx-aurora-two" /><div className="vfx-aurora vfx-aurora-three" /><div className="vfx-grid" /><canvas ref={canvas} /><div className="vfx-horizon" /></div>;
}

export function LivingOrb({ compact = false }) {
  return <div className={`vfx-orb-scene${compact ? " vfx-orb-compact" : ""}`} aria-hidden="true">
    <div className="vfx-orb-halo" /><div className="vfx-orb-ring vfx-ring-one"><i /></div><div className="vfx-orb-ring vfx-ring-two"><i /></div><div className="vfx-orb-ring vfx-ring-three" />
    <div className="vfx-orb"><div className="vfx-orb-sheen" /><span>✳</span></div>
    <span className="vfx-orb-label vfx-label-one">◎ think together</span><span className="vfx-orb-label vfx-label-two">↗ make something</span><span className="vfx-orb-label vfx-label-three">♫ your kind of energy</span>
    <div className="vfx-orb-caption"><i /> A WORLD THAT MOVES WITH YOU</div>
  </div>;
}
