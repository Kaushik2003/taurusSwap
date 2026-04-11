/**
 * POST /api/faucet
 *
 * Request body (JSON):
 *   { walletAddress: string; assetId: number; amount: number }
 *
 * amount is in whole tokens (e.g. 10 means 10 USDC).
 *
 * Success response:
 *   { success: true; txId: string; claimed: number; remaining: number }
 *
 * Error response:
 *   { success: false; error: string; remaining?: number }
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { isValidAddress, hasOptedIn, sendAsset, getDispenserBalance } from '@/lib/algorand';
import { checkRateLimit, recordClaim } from '@/lib/rateLimit';
import { VALID_ASSET_IDS, getToken, toBaseUnits } from '@/lib/tokens';

const MAX_AMOUNT_PER_REQUEST = 100; // whole tokens
const MIN_AMOUNT_PER_REQUEST = 1;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(400, 'Invalid JSON body.');
  }

  if (!body || typeof body !== 'object') {
    return error(400, 'Request body must be a JSON object.');
  }

  const { walletAddress, assetId, amount } = body as Record<string, unknown>;

  // --- Input validation ---

  if (typeof walletAddress !== 'string' || !isValidAddress(walletAddress)) {
    return error(400, 'Invalid Algorand wallet address.');
  }

  if (typeof assetId !== 'number' || !Number.isInteger(assetId) || !VALID_ASSET_IDS.has(assetId)) {
    return error(400, 'Unsupported asset ID.');
  }

  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount < MIN_AMOUNT_PER_REQUEST ||
    amount > MAX_AMOUNT_PER_REQUEST
  ) {
    return error(
      400,
      `Amount must be between ${MIN_AMOUNT_PER_REQUEST} and ${MAX_AMOUNT_PER_REQUEST} tokens.`,
    );
  }

  const token = getToken(assetId)!;

  // --- Rate limit check ---

  const limitResult = checkRateLimit(walletAddress, assetId, amount, token.dailyLimit);
  if (!limitResult.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Daily limit reached. You have already claimed ${limitResult.claimed} ${token.symbol} today (limit: ${limitResult.limit}).`,
        remaining: limitResult.remaining,
      },
      { status: 429 },
    );
  }

  // --- Opt-in check ---

  let optedIn: boolean;
  try {
    optedIn = await hasOptedIn(walletAddress, assetId);
  } catch {
    return error(502, 'Could not reach Algorand node. Please try again shortly.');
  }

  if (!optedIn) {
    return error(
      400,
      `Your wallet has not opted in to ${token.symbol} (ASA ${assetId}). Please opt in first, then request tokens.`,
    );
  }

  // --- Dispenser balance check ---

  const baseUnits = toBaseUnits(amount, token.decimals);
  let dispenserBalance: bigint;
  try {
    dispenserBalance = await getDispenserBalance(assetId);
  } catch {
    return error(502, 'Could not check dispenser balance. Please try again shortly.');
  }

  if (dispenserBalance < baseUnits) {
    return error(503, `Faucet is temporarily out of ${token.symbol}. Please check back later.`);
  }

  // --- Send ---

  let txId: string;
  try {
    txId = await sendAsset(walletAddress, assetId, baseUnits);
  } catch (err) {
    console.error('[faucet] sendAsset failed:', err);
    return error(500, 'Transaction failed. Please try again.');
  }

  // Record only after on-chain success.
  recordClaim(walletAddress, assetId, amount);

  const newRemaining = limitResult.remaining - amount;

  return NextResponse.json({
    success: true,
    txId,
    claimed: amount,
    symbol: token.symbol,
    remaining: newRemaining,
  });
}

// GET — return per-asset faucet balances (nice-to-have for the UI).
export async function GET() {
  const { FAUCET_TOKENS } = await import('@/lib/tokens');
  const { getDispenserBalance } = await import('@/lib/algorand');

  const balances = await Promise.all(
    FAUCET_TOKENS.map(async (t) => {
      try {
        const raw = await getDispenserBalance(t.assetId);
        return {
          assetId: t.assetId,
          symbol: t.symbol,
          balance: Number(raw) / 10 ** t.decimals,
        };
      } catch {
        return { assetId: t.assetId, symbol: t.symbol, balance: null };
      }
    }),
  );

  return NextResponse.json({ balances });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function error(status: number, message: string) {
  return NextResponse.json({ success: false, error: message }, { status });
}
