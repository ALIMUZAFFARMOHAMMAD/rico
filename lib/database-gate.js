// Per-process protection complements the shared SQL admission limits. No retries:
// a timed-out write may already have committed and must never be replayed here.
export function createDatabaseGate({ concurrency = 8, queueLimit = 16, queueMs = 2000,
  failureLimit = 5, cooldownMs = 5000, now = () => Date.now() } = {}) {
  let active = 0, failures = 0, openUntil = 0, probe = false, epoch = 0;
  const waiting = [];
  const unavailable = () => new Error('Database temporarily unavailable');
  function drain() {
    while (active < concurrency && waiting.length) {
      const item = waiting.shift();
      clearTimeout(item.timer);
      active++;
      item.resolve();
    }
  }
  function acquire() {
    if (active < concurrency) { active++; return Promise.resolve(); }
    if (waiting.length >= queueLimit) return Promise.reject(unavailable());
    return new Promise((resolve, reject) => {
      const item = { resolve, reject };
      item.timer = setTimeout(() => {
        const index = waiting.indexOf(item);
        if (index !== -1) { waiting.splice(index, 1); reject(unavailable()); }
      }, queueMs);
      waiting.push(item);
    });
  }
  function checkCircuit() {
    if (!openUntil) return false;
    if (now() < openUntil || probe) throw unavailable();
    probe = true;
    return true;
  }
  return async function run(operation) {
    // Fast rejection before queuing; check again once a slot becomes available.
    if (openUntil && (now() < openUntil || probe)) throw unavailable();
    await acquire();
    let isProbe = false, startedEpoch = epoch, invoked = false;
    try {
      isProbe = checkCircuit();
      startedEpoch = epoch;
      invoked = true;
      const result = await operation();
      if (startedEpoch === epoch) { failures = 0; openUntil = 0; }
      return result;
    } catch (error) {
      // Transport/timeouts and 429/5xx are capacity failures. A valid 4xx response
      // still proves the database is reachable, and must not open the circuit.
      if (invoked && startedEpoch === epoch) {
        if (error.databaseReachable) { failures = 0; openUntil = 0; }
        else if (isProbe || ++failures >= failureLimit) {
          openUntil = now() + cooldownMs;
          epoch++;
          for (const item of waiting.splice(0)) { clearTimeout(item.timer); item.reject(unavailable()); }
        }
      }
      throw error;
    } finally {
      if (isProbe) probe = false;
      active--;
      drain();
    }
  };
}

export const databaseGate = createDatabaseGate();
