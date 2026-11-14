// Recover through normal site navigation; never request tokens directly.
export function createChatRecovery({ healthy, recover, ready, canRecover, log, now = Date.now,
  graceMs = 12000, cooldownMs = 15000, maxAttempts = 3 }) {
  let lostAt = null, lastAttempt = -Infinity, attempts = 0, busy = false, wasHealthy = true;
  return {
    async tick() {
      if (!canRecover() || busy) return;
      busy = true;
      try {
        if (healthy()) {
          if (!wasHealthy) {
            if (await ready(true) === false) return;
            log('connection-restored');
          }
          lostAt = null; wasHealthy = true;
          return;
        }
        if (lostAt === null) {
          lostAt = now(); wasHealthy = false;
          await ready(false); log('connection-lost');
        }
        if (attempts >= maxAttempts || now() - lostAt < graceMs || now() - lastAttempt < cooldownMs) return;
        lastAttempt = now(); attempts++;
        log('recovery-attempt-' + attempts);
        try { await recover(); } catch { log('recovery-navigation-failed'); }
        if (attempts === maxAttempts) log('recovery-budget-used');
      } finally { busy = false; }
    },
    snapshot: () => ({ attempts, maxAttempts, graceMs, cooldownMs })
  };
}