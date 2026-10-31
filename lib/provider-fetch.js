import { randomUUID } from "crypto";
import { scaleEnabled, scaleRpc } from "./scale";
import { recordOperation } from "./operational-metrics";

const PROVIDERS = new Set(["api.anthropic.com", "api.openai.com", "api.elevenlabs.io"]);
function setting(name, fallback, max) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 && value <= max ? value : fallback;
}

// A fleet-wide request budget, not a currency spending guarantee.
export async function providerFetch(url, options = {}) {
  const target = new URL(url);
  const selfVoiceOrigin = process.env.RICO_VOICE_URL ? new URL(process.env.RICO_VOICE_URL).origin : null;
  const metered = PROVIDERS.has(target.hostname) || target.origin === selfVoiceOrigin;
  // Privacy cleanup must remain available even when generation credits are capped.
  const deleting = options.method === "DELETE" || target.origin === selfVoiceOrigin && target.pathname.endsWith("/delete");
  if (metered && !deleting && process.env.AI_GENERATION_DISABLED === "true") throw new Error("AI generation is disabled for this environment.");
  if (!metered || deleting || !scaleEnabled()) return globalThis.fetch(url, options);
  const token = randomUUID();
  const admitted = await scaleRpc("provider_admit", {
    p_token: token,
    p_daily_limit: setting("AI_DAILY_REQUEST_LIMIT", 1000, 10000000),
    p_concurrency: setting("AI_MAX_CONCURRENT", 8, 1000),
  });
  if (!admitted) throw new Error("AI capacity reached. Please try again later.");
  const deadline = AbortSignal.timeout(90000);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
  let released = false;
  const started = Date.now();
  let status = 0;
  let failed = false;
  const release = async () => {
    if (released) return;
    released = true;
    recordOperation("provider", started, status, failed);
    await scaleRpc("release_lease", { p_key: `provider:${token}`, p_token: token }).catch(() => console.error("AI slot release failed; awaiting expiry"));
  };
  try {
    const response = await globalThis.fetch(url, { ...options, signal });
    status = response.status;
    failed = !response.ok;
    // Preserve streaming speech and hold admission until consumption finishes.
    if (!response.ok || !response.body) { await release(); return response; }
    const reader = response.body?.getReader();
    let size = 0;
    const body = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) { await release(); controller.close(); return; }
          size += value.byteLength;
          if (size > 32 * 1024 * 1024) { await reader.cancel(); throw new Error("AI response exceeded size limit"); }
          controller.enqueue(value);
        } catch (error) { failed = true; await release(); controller.error(error); }
      },
      async cancel(reason) { try { await reader.cancel(reason); } finally { await release(); } },
    });
    const headers = new Headers(response.headers);
    headers.delete("content-length"); headers.delete("content-encoding");
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) { failed = true; await release(); throw error; }
}
