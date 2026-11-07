// A restarted or closed game must never receive an old opponent's move.
export function createGameTimers(schedule = setTimeout, clear = clearTimeout) {
  let generation = 0;
  const pending = new Set();
  return {
    schedule(callback, delay) {
      const round = generation;
      const timer = schedule(() => {
        pending.delete(timer);
        if (round === generation) callback();
      }, delay);
      pending.add(timer);
      return timer;
    },
    cancel() {
      generation += 1;
      for (const timer of pending) clear(timer);
      pending.clear();
    },
  };
}
