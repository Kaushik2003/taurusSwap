import { PRECISION } from "../constants";
import { mulScaled, sqrt } from "./bigint-math";
import { Tick, TickState } from "../types";

export interface ConsolidationResult {
  rInt: bigint;
  sBound: bigint;
  kBound: bigint;
  interiorTicks: Tick[];
  boundaryTicks: Tick[];
}

export function consolidateTicks(
  ticks: Tick[],
  sqrtN: bigint,
): ConsolidationResult {
  let rInt = 0n;
  let sBound = 0n;
  let kBound = 0n;
  const interiorTicks: Tick[] = [];
  const boundaryTicks: Tick[] = [];

  for (const tick of ticks) {
    if (tick.state === TickState.INTERIOR) {
      rInt += tick.r;
      interiorTicks.push(tick);
      continue;
    }

    const rSqrtN = mulScaled(tick.r, sqrtN, PRECISION);
    const diff = tick.k - rSqrtN;
    const sSq = tick.r * tick.r - diff * diff;

    if (sSq < 0n) {
      throw new Error(`Tick ${tick.id} has invalid parameters: s^2 < 0`);
    }

    sBound += sqrt(sSq);
    kBound += tick.k;
    boundaryTicks.push(tick);
  }

  return { rInt, sBound, kBound, interiorTicks, boundaryTicks };
}

export function normalizedInteriorProjection(
  sumX: bigint,
  invSqrtN: bigint,
  kBound: bigint,
  rInt: bigint,
): bigint {
  if (rInt === 0n) return 0n;

  const alphaTotal = mulScaled(sumX, invSqrtN, PRECISION);
  const alphaInt = alphaTotal - kBound;
  return (alphaInt * PRECISION) / rInt;
}
