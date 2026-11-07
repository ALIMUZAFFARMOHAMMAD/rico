// Low-volume operational events. Never include URLs, IDs, prompts or response bodies.
export function recordOperation(service, started, status, failed = false) {
  const durationMs = Math.max(0, Date.now() - started);
  if (!["database", "provider"].includes(service)) return;
  if (!failed && durationMs < 750 && Math.random() >= 0.01) return;
  const event = { event: "rico_operation", service, durationMs, status: Number.isInteger(status) ? status : 0, failed: !!failed };
  console.info(JSON.stringify(event));
}
