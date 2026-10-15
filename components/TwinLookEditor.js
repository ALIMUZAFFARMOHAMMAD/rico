import { useRef, useState } from "react";
import Dialog from "./Dialog";
import TonyCharacter from "./TonyCharacter";
import { resizeImage } from "../lib/resizeImage";
import { cleanLook, shade } from "../lib/avatar-look";
import ui from "./SocialUI.module.css";
import s from "./TwinLookEditor.module.css";

export default function TwinLookEditor({ userId, twin, onSaved, onClose }) {
  const input = useRef(null);
  const [photo, setPhoto] = useState("");
  const [look, setLook] = useState(() => cleanLook(twin.look) || { skin: "#e8a96e", skinD: "#d18f54", hair: "#241a12", hoodie: "#8b5cf6", hoodieD: "#7146d1", beard: false });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);

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
      setPhoto(url); setStatus("Photo ready. Create a preview to match your colours.");
    } catch { setError("Couldn't open that photo. Try a JPG, PNG or a screenshot of your selfie."); }
    finally { setBusy(""); }
  }

  async function request(action) {
    setError(""); setStatus("");
    setBusy(action === "preview" ? "Matching your photo…" : "Saving your look…");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch("/api/avatar", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action, ...(action === "preview" ? { image: photo } : { look }) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !cleanLook(data.look) || (action === "save" && data.applied !== true)) throw new Error(data.error || (response.status === 401 ? "Your session expired. Sign in again and retry." : "Couldn't update your twin. Please try again."));
      setLook(data.look);
      if (action === "save") { onSaved(data.look); onClose(); }
      else { setDirty(true); setStatus("Preview ready. Adjust anything you like, then save."); }
    } catch (err) { setError(err.name === "AbortError" ? "That took too long. Please try again." : err.message); }
    finally { clearTimeout(timer); setBusy(""); }
  }

  function changeColour(key, value) {
    setLook(previous => ({ ...previous, [key]: value, ...(key === "hair" ? {} : { [key + "D"]: shade(value) }) }));
    setDirty(true); setStatus("");
  }

  return <Dialog title="Your twin’s look" onClose={onClose} busy={!!busy}>
    <p className={ui.muted}>A little more like you. Match your photo’s colours, then make the cartoon your own.</p>
    <div className={s.previews}>
      <div className={s.photo}>
        {photo ? <img src={photo} alt="Your selected photo, ready to preview" /> : <span className={s.placeholder} aria-hidden="true">＋</span>}
        <span className={s.caption}>{photo ? "Your photo" : "Start with a selfie"}</span>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" aria-label="Choose your photo" onChange={choosePhoto} hidden />
        <button className={ui.secondary} disabled={!!busy} onClick={() => input.current?.click()}>{photo ? "Change photo" : "Choose photo"}</button>
      </div>
      <div className={s.cartoon} style={{ background: `radial-gradient(circle,${look.hoodie}40,transparent)` }}>
        <TonyCharacter size={185} look={look} animated={false} float="none" pose="wave" />
        <span className={s.caption}>Your cartoon preview</span>
      </div>
    </div>
    <p className={s.help}>Use a clear photo of just you. JPG, PNG, WebP or HEIC, up to 20 MB.</p>
    <button className={`${ui.primary} ${s.generate}`} disabled={!photo || !!busy} onClick={() => request("preview")}>Create preview from photo</button>
    <p className={s.help}>Creating a preview sends your photo to Anthropic to match its colours. Ricomates saves only the cartoon settings, not your photo. This creates a stylized cartoon, not a photo portrait.</p>
    <fieldset className={s.controls} disabled={!!busy}>
      <legend>Make it yours</legend>
      <div className={s.colours}>
        {[["skin", "Skin"], ["hair", "Hair"], ["hoodie", "Outfit"]].map(([key, label]) => <label key={key}><input type="color" value={look[key]} onChange={event => changeColour(key, event.target.value)} />{label}</label>)}
      </div>
      <label className={s.beard}><input type="checkbox" checked={look.beard} onChange={event => { setLook(previous => ({ ...previous, beard: event.target.checked })); setDirty(true); }} />Facial hair</label>
    </fieldset>
    <div role="status" aria-live="polite" className={s.status}>{busy || status || "You can also choose your colours without a photo."}</div>
    {error && <p role="alert" className={ui.notice}>{error}</p>}
    <div className={ui.actions}>
      <button className={ui.secondary} disabled={!!busy} onClick={onClose}>Cancel</button>
      <button className={ui.primary} disabled={!dirty || !!busy} onClick={() => request("save")}>Save twin’s look</button>
    </div>
  </Dialog>;
}
