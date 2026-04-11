/**
 * In-memory rate limiter.
 *
 * Tracks how many tokens each wallet has claimed for each asset within the
 * current UTC day.  State is lost on server restart — acceptable for a testnet
 * faucet.  Swap the store for Redis / SQLite if persistence is needed.
 *
 * Key format:  `<walletAddress>:<assetId>:<YYYY-MM-DD>`
 */

const store = new Map<string, number>();

/** Returns the UTC date string for today, e.g. "2025-06-15". */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeKey(wallet: string, assetId: number): string {
  return `${wallet}:${assetId}:${todayKey()}`;
}

/**
 * Returns how many tokens (whole units) the wallet has already claimed today
 * for the given asset.
 */
export function getClaimedToday(wallet: string, assetId: number): number {
  return store.get(makeKey(wallet, assetId)) ?? 0;
}

/**
 * Records a claim.  Call AFTER the on-chain transfer succeeds.
 */
export function recordClaim(wallet: string, assetId: number, amount: number): void {
  const key = makeKey(wallet, assetId);
  store.set(key, (store.get(key) ?? 0) + amount);
}

/**
 * Returns { allowed: true } when the request is within limits, or
 * { allowed: false, claimed, limit, remaining } when it would exceed them.
 */
export function checkRateLimit(
  wallet: string,
  assetId: number,
  requestedAmount: number,
  dailyLimit: number,
): { allowed: true; claimed: number; remaining: number } | { allowed: false; claimed: number; limit: number; remaining: number } {
  const claimed = getClaimedToday(wallet, assetId);
  const remaining = Math.max(0, dailyLimit - claimed);

  if (requestedAmount > remaining) {
    return { allowed: false, claimed, limit: dailyLimit, remaining };
  }
  return { allowed: true, claimed, remaining };
}
