// Bounded JSON requests for interactive screens. Never silently accept an error
// response as successful content or leave a control waiting indefinitely.
export async function requestJson(url, options = {}) {
  const { timeoutMs = 30000, ...init } = options;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init.signal?.aborted) cancel();
  else init.signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = await response.json();
    if (!response.ok || data?.ok === false) {
      throw new Error(typeof data?.error === 'string' ? data.error.slice(0, 240) : 'Could not complete that request. Please try again.');
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The request was interrupted or took too long. Please try again.');
    if (error instanceof SyntaxError) throw new Error('The server returned an unreadable response. Please try again.');
    throw error;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', cancel);
  }
}

export async function requestTranslation(text, from, to, signal) {
  const data = await requestJson('/api/translate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, from, to }), signal,
  });
  if (typeof data?.text !== 'string' || !data.text.trim()) throw new Error('No translation was returned. Please try again.');
  return data.text.trim();
}

// Waiting for the notice is essential: recording it creates a feedback loop.
export async function beginTranslationTurn({ needsNotice, notice, current, listen }) {
  if (needsNotice && await notice() === false) return;
  if (current()) await listen();
}
