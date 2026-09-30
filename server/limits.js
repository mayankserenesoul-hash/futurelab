// A small "at most N per time window" limiter. Pure logic, so it can be tested without a server.
export function createWindowLimiter({ max, windowMs, now = Date.now }) {
  const hits = new Map(); // key -> list of timestamps

  return {
    // Returns true if this request is allowed (and counts it), false if the limit is reached
    take(key = "all") {
      const t = now();
      const recent = (hits.get(key) || []).filter((x) => t - x < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      return true;
    },
    // Forget keys with no recent activity so the map can't grow forever
    prune() {
      const t = now();
      for (const [key, times] of hits) {
        const recent = times.filter((x) => t - x < windowMs);
        if (recent.length) hits.set(key, recent);
        else hits.delete(key);
      }
    },
    size: () => hits.size,
  };
}