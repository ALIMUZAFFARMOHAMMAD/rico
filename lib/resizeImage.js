// Downscale + re-encode any photo (incl. iPhone HEIC) to a small JPEG so it's
// under the upload limit and in a format the vision model can read.
export function resizeImage(file, max = 768, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    let settled = false;
    // Some browsers (Android/in-app webviews) can't decode HEIC and fire NEITHER
    // onload nor onerror — the promise would hang forever. Guard with a timeout.
    const finish = (fn, arg) => {
      if (settled) return; settled = true;
      clearTimeout(timer);
      try { URL.revokeObjectURL(url); } catch (e) {}
      fn(arg);
    };
    const timer = setTimeout(() => finish(reject, new Error("timeout")), 12000);
    img.onload = () => {
      let { width, height } = img;
      if (!width || !height) return finish(reject, new Error("empty"));
      const scale = Math.min(1, max / Math.max(width, height));
      width = Math.round(width * scale); height = Math.round(height * scale);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width); canvas.height = Math.max(1, height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("canvas");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", quality);
        if (!data.startsWith("data:image/jpeg;base64,")) throw new Error("encode");
        finish(resolve, data);
      } catch (e) { finish(reject, e); }
    };
    img.onerror = () => finish(reject, new Error("decode"));
    img.src = url;
  });
}

