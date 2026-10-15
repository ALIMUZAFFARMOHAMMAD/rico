import { useEffect, useRef, useState } from "react";
import Dialog from "./Dialog";
import { resizeImage } from "../lib/resizeImage";
import ui from "./SocialUI.module.css";
import s from "./TwinLookEditor.module.css";

export default function TwinLookEditor({ userId, twin, onSaved, onClose }) {
  const input = useRef(null);
  const [photo, setPhoto] = useState("");
  const [portrait, setPortrait] = useState("");
  const [style, setStyle] = useState("natural");
  const [consent, setConsent] = useState(false);
  const [available, setAvailable] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(`/api/portrait?userId=${encodeURIComponent(userId)}`).then(r => r.ok ? r.json() : Promise.reject()).then(data => { if (alive) setAvailable(data.available); }).catch(() => { if (alive) setAvailable(false); });
    return () => { alive = false; };
  }, [userId]);

  async function choosePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setStatus("");
    if (file.size > 20 * 1024 * 1024) { setError("Choose a photo smaller than 20 MB."); return; }
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) { setError("Choose a JPG, PNG, WebP or iPhone photo."); return; }
    setBusy("Preparing your photo…");
    try {
      let source = file;
      // Safari can decode HEIC natively. Only load the converter when needed.
      let url;
      try { url = await resizeImage(source); }
      catch (decodeError) {
        if (!/heic|heif/i.test(file.type + file.name)) throw decodeError;
        setBusy("Converting your iPhone photo…");
        const convert = (await import("heic2any")).default;
        let timer;
        try {
          const result = await Promise.race([convert({ blob: file, toType: "image/jpeg", quality: 0.85 }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("conversion")), 20000); })]);
          source = Array.isArray(result) ? result[0] : result;
          url = await resizeImage(source);
        } finally { clearTimeout(timer); }
      }
      setPhoto(url); setPortrait(""); setConsent(false); setStatus("Photo ready. Choose a style and generate your portrait.");
    } catch { setError("Couldn't open that photo. Try a JPG, PNG or a screenshot of your selfie."); }
    finally { setBusy(""); }
  }

  async function request(action) {
    setError(""); setStatus("");
    setBusy(action === "generate" ? "Creating your portrait — this can take a minute or two…" : "Saving your portrait…");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), action === "generate" ? 165000 : 30000);
    try {
      const response = await fetch("/api/portrait", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action, consent, style, ...(action === "generate" ? { image: photo } : action === "save" ? { image: portrait } : {}) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Couldn't update your portrait. Please try again.");
      if (action === "generate") {
        if (!data.image?.startsWith("data:image/jpeg;base64,")) throw new Error("No portrait was returned. Please try again.");
        const bytes = Uint8Array.from(atob(data.image.split(",")[1]), character => character.charCodeAt(0));
        const preview = await resizeImage(new Blob([bytes], { type: "image/jpeg" }), 512, 0.8);
        setPortrait(preview); setStatus("Your AI portrait is ready. Save it when you're happy with it.");
      } else {
        if (data.applied !== true) throw new Error("Your portrait wasn't saved. Please try again.");
        onSaved(data.avatar); onClose();
      }
    } catch (err) { setError(err.name === "AbortError" ? "That took too long. Please try again." : err.message); }
    finally { clearTimeout(timer); setBusy(""); }
  }

  return <Dialog title="Your AI portrait" onClose={onClose} busy={!!busy}>
    <p className={ui.muted}>You, in a new light. Create a realistic portrait from your photo while keeping your features recognizable.</p>
    <div className={s.previews}>
      <div className={s.photo}>
        {photo ? <img src={photo} alt="Your selected reference photo" /> : <span className={s.placeholder} aria-hidden="true">＋</span>}
        <span className={s.caption}>{photo ? "Your reference photo" : "Start with a selfie"}</span>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" aria-label="Choose your photo" onChange={choosePhoto} hidden />
        <button className={ui.secondary} disabled={!!busy} onClick={() => input.current?.click()}>{photo ? "Change photo" : "Choose photo"}</button>
      </div>
      <div className={s.portrait}>
        {portrait || twin.avatar ? <img src={portrait || twin.avatar} alt={portrait ? "Generated AI portrait preview" : "Your current portrait"} /> : <div className={s.portraitPlaceholder}><span aria-hidden="true">✧</span><p>Your portrait<br />will appear here</p></div>}
        <span className={s.caption}>{portrait ? "AI portrait · preview" : twin.avatar ? "Your current portrait" : "Photorealistic · made for you"}</span>
      </div>
    </div>
    <p className={s.help}>Choose a clear photo of just you. JPG, PNG, WebP or HEIC, up to 20 MB.</p>
    <fieldset className={s.controls} disabled={!!busy}>
      <legend>Choose your setting</legend>
      <div className={s.styles}>
        {[["natural", "Natural", "Soft daylight"], ["studio", "Studio", "Clean & polished"], ["outdoors", "Outdoors", "Golden-hour glow"]].map(([value, label, detail]) => <button type="button" key={value} aria-pressed={style === value} onClick={() => setStyle(value)}><strong>{label}</strong><span>{detail}</span></button>)}
      </div>
    </fieldset>
    <label className={ui.consent}><input type="checkbox" checked={consent} disabled={!!busy} onChange={event => setConsent(event.target.checked)} />This is my photo. I agree to send it to OpenAI to create my portrait. If I save it, the generated portrait will be visible on my public AI twin.</label>
    {available === false && <p className={ui.notice}>AI portrait generation is temporarily unavailable. Please try again later.</p>}
    <button className={ui.primary + " " + s.generate} disabled={!photo || !consent || !!busy || available !== true} onClick={() => request("generate")}>{portrait ? "Generate another portrait" : "Generate AI portrait"}</button>
    <p className={s.help}>Only the portrait you save is stored by Ricomates. Your reference photo isn't saved. AI-generated portraits may vary; preview the result before saving.</p>
    <div role="status" aria-live="polite" className={s.status}>{busy || status}</div>
    {error && <p role="alert" className={ui.notice}>{error}</p>}
    <div className={ui.actions}>
      <button className={ui.secondary} disabled={!!busy} onClick={onClose}>Cancel</button>
      <button className={ui.primary} disabled={!portrait || !consent || !!busy} onClick={() => request("save")}>Save portrait</button>
    </div>
    {twin.avatar && <button className={s.remove} disabled={!!busy} onClick={() => request("remove")}>Remove saved portrait</button>}
  </Dialog>;
}
