import { useMemo } from 'react';
import type { PoolState, SwapQuote } from '@/lib/orbital-sdk';

/**
 * AMOUNT_SCALE = raw_microunits / 1000.
 * PRECISION = 1e9 (for sqrtN / invSqrtN).
 */
const AMOUNT_SCALE_DIV = 1000;
const PRECISION = 1_000_000_000;

export interface LivePoolMetrics {
  ready: boolean;
  n: number;

  /** Reserves in AMOUNT_SCALE units as plain Numbers. */
  reserves: number[];
  sellIdx: number;
  buyIdx: number;

  // Consolidated torus params (AMOUNT_SCALE units)
  rInt: number;
  sBound: number;
  kBound: number;
  sqrtN: number;

  // Polar decomposition of current reserve vector x
  alpha: number;       // (Σxᵢ) / √n — component along equal-price direction
  wMagnitude: number;  // |x − α·1̂/√n| — trading-plane magnitude
  totalR: number;      // sum of r across all ticks

  // Torus cross-section coordinates (α, |w|) relative to center (k+r√n, s_bound)
  minorX: number;
  minorY: number;
  minorAngle: number;  // atan2(minorY, minorX) — position on the interior circle
  minorRadius: number; // should ≈ rInt; residual shows solver error

  // Major angle in the sell/buy 2D projection of the trading plane
  majorAngle: number;  // atan2(w_buy, w_sell)

  // Post-swap snapshot (null if no live quote)
  post: null | {
    reserves: number[];
    alpha: number;
    wMagnitude: number;
    minorX: number;
    minorY: number;
    minorAngle: number;
    minorRadius: number;
    majorAngle: number;
  };

  // Quote echo
  amountInRawMicro: bigint;
  amountOutRawMicro: bigint;
  priceImpact: number;
  ticksCrossed: number;

  /** Normalisation factor that maps AMOUNT_SCALE units → unit-less scene coordinates. */
  visScale: number;
}

export function useLivePoolMetrics(
  pool: PoolState | undefined,
  quote: SwapQuote | undefined,
  sellIdx: number,
  buyIdx: number,
): LivePoolMetrics {
  return useMemo(() => {
    if (!pool) {
      return emptyMetrics(sellIdx, buyIdx);
    }

    const n = pool.n;
    const sqrtN = Number(pool.sqrtN) / PRECISION;
    const reserves = pool.reserves.map((r) => Number(r));
    const rInt = Number(pool.rInt);
    const sBound = Number(pool.sBound);
    const kBound = Number(pool.kBound);
    const totalR = Number(pool.totalR);

    const { alpha, wMagnitude, majorAngle } = polarDecomposition(
      reserves,
      sqrtN,
      sellIdx,
      buyIdx,
    );

    const { minorX, minorY, minorAngle, minorRadius } = crossSection(
      alpha,
      wMagnitude,
      kBound,
      rInt,
      sBound,
      sqrtN,
    );

    // Build post-swap metrics if a live quote exists for this pair
    let post: LivePoolMetrics['post'] = null;
    if (
      quote &&
      quote.amountIn > 0n &&
      quote.amountOut > 0n &&
      sellIdx !== buyIdx
    ) {
      const dIn = Number(quote.amountIn) / AMOUNT_SCALE_DIV;
      const dOut = Number(quote.amountOut) / AMOUNT_SCALE_DIV;
      const postReserves = reserves.slice();
      postReserves[sellIdx] = reserves[sellIdx] + dIn;
      postReserves[buyIdx] = reserves[buyIdx] - dOut;

      const {
        alpha: pAlpha,
        wMagnitude: pW,
        majorAngle: pMajor,
      } = polarDecomposition(postReserves, sqrtN, sellIdx, buyIdx);
      const {
        minorX: pMinX,
        minorY: pMinY,
        minorAngle: pMinA,
        minorRadius: pMinR,
      } = crossSection(pAlpha, pW, kBound, rInt, sBound, sqrtN);

      post = {
        reserves: postReserves,
        alpha: pAlpha,
        wMagnitude: pW,
        minorX: pMinX,
        minorY: pMinY,
        minorAngle: pMinA,
        minorRadius: pMinR,
        majorAngle: pMajor,
      };
    }

    // Visual scene normalisation: keep the torus visible regardless of scale.
    // Target: sBound → 3.0 units in scene space.
    const visScale = sBound > 0 ? 3.0 / sBound : 1.0;

    return {
      ready: true,
      n,
      reserves,
      sellIdx,
      buyIdx,
      rInt,
      sBound,
      kBound,
      sqrtN,
      alpha,
      wMagnitude,
      totalR,
      minorX,
      minorY,
      minorAngle,
      minorRadius,
      majorAngle,
      post,
      amountInRawMicro: quote?.amountIn ?? 0n,
      amountOutRawMicro: quote?.amountOut ?? 0n,
      priceImpact: quote?.priceImpact ?? 0,
      ticksCrossed: quote?.ticksCrossed ?? 0,
      visScale,
    };
  }, [pool, quote, sellIdx, buyIdx]);
}

function polarDecomposition(
  reserves: number[],
  sqrtN: number,
  sellIdx: number,
  buyIdx: number,
) {
  const sumX = reserves.reduce((acc, v) => acc + v, 0);
  const alpha = sqrtN > 0 ? sumX / sqrtN : 0;
  // w = x - (α/√n)·1̂   (component of x orthogonal to the equal-price vector)
  const shift = sqrtN > 0 ? alpha / sqrtN : 0;
  let wSq = 0;
  for (const v of reserves) {
    const wi = v - shift;
    wSq += wi * wi;
  }
  const wMagnitude = Math.sqrt(Math.max(0, wSq));
  // Major angle: project w onto the 2D sell/buy slice for a stable viz angle.
  const wSell = reserves[sellIdx] - shift;
  const wBuy = reserves[buyIdx] - shift;
  const majorAngle = Math.atan2(wBuy, wSell);
  return { alpha, wMagnitude, majorAngle };
}

function crossSection(
  alpha: number,
  wMagnitude: number,
  kBound: number,
  rInt: number,
  sBound: number,
  sqrtN: number,
) {
  // Torus cross-section is centred at (k_bound + r_int·√n, s_bound)
  // in (α, |w|) space with minor radius r_int.
  const cX = kBound + rInt * sqrtN;
  const cY = sBound;
  const minorX = alpha - cX;
  const minorY = wMagnitude - cY;
  const minorAngle = Math.atan2(minorY, minorX);
  const minorRadius = Math.sqrt(minorX * minorX + minorY * minorY);
  return { minorX, minorY, minorAngle, minorRadius };
}

function emptyMetrics(sellIdx: number, buyIdx: number): LivePoolMetrics {
  return {
    ready: false,
    n: 5,
    reserves: [],
    sellIdx,
    buyIdx,
    rInt: 0,
    sBound: 0,
    kBound: 0,
    sqrtN: 0,
    alpha: 0,
    wMagnitude: 0,
    totalR: 0,
    minorX: 0,
    minorY: 0,
    minorAngle: 0,
    minorRadius: 0,
    majorAngle: 0,
    post: null,
    amountInRawMicro: 0n,
    amountOutRawMicro: 0n,
    priceImpact: 0,
    ticksCrossed: 0,
    visScale: 1,
  };
}
