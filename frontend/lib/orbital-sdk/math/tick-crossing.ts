import { MAX_TICK_CROSSINGS, PRECISION } from "../constants";
import { Tick, TickState, TradeSegment } from "../types";
import {
  ConsolidationResult,
  consolidateTicks,
  normalizedInteriorProjection,
} from "./consolidation";
import { solveSwapNewton } from "./newton";
import { computeAggregates } from "./sphere";

export function executeTradeWithCrossings(
  amountIn: bigint,
  tokenIn: number,
  tokenOut: number,
  reserves: bigint[],
  ticks: Tick[],
  n: number,
  sqrtN: bigint,
  invSqrtN: bigint,
): { totalOutput: bigint; segments: TradeSegment[] } {
  let remainingInput = amountIn;
  let totalOutput = 0n;
  const segments: TradeSegment[] = [];
  let currentReserves = [...reserves];
  let currentTicks = ticks.map((tick) => ({ ...tick }));

  for (let crossing = 0; crossing < MAX_TICK_CROSSINGS; crossing += 1) {
    if (remainingInput <= 0n) break;

    const consol = consolidateTicks(currentTicks, sqrtN);
    const { sumX, sumXSq } = computeAggregates(currentReserves);

    if (consol.rInt === 0n && consol.sBound === 0n) {
      throw new Error("No liquidity — all ticks exhausted");
    }

    let delta: bigint;
    try {
      delta = solveSwapNewton(
        remainingInput,
        tokenIn,
        tokenOut,
        currentReserves,
        n,
        consol.rInt,
        consol.sBound,
        consol.kBound,
        sqrtN,
        invSqrtN,
        sumX,
        sumXSq,
      );
    } catch {
      throw new Error("Trade too large for available liquidity");
    }

    const newReserves = [...currentReserves];
    newReserves[tokenIn] += remainingInput;
    newReserves[tokenOut] -= delta;

    const { sumX: newSumX } = computeAggregates(newReserves);
    const newAlphaIntNorm = normalizedInteriorProjection(
      newSumX,
      invSqrtN,
      consol.kBound,
      consol.rInt,
    );

    const crossingTick = findCrossingTick(
      newAlphaIntNorm,
      consol.interiorTicks,
      consol.boundaryTicks,
    );

    if (crossingTick === null) {
      segments.push({
        amountIn: remainingInput,
        amountOut: delta,
        tickCrossedId: null,
        newTickState: null,
      });
      totalOutput += delta;
      currentReserves[tokenIn] += remainingInput;
      currentReserves[tokenOut] -= delta;
      remainingInput = 0n;
      continue;
    }

    const { partialIn, partialOut } = findCrossingPoint(
      remainingInput,
      tokenIn,
      tokenOut,
      currentReserves,
      n,
      consol,
      crossingTick,
      sqrtN,
      invSqrtN,
    );

    segments.push({
      amountIn: partialIn,
      amountOut: partialOut,
      tickCrossedId: crossingTick.id,
      newTickState:
        crossingTick.state === TickState.INTERIOR
          ? TickState.BOUNDARY
          : TickState.INTERIOR,
    });

    totalOutput += partialOut;
    currentReserves[tokenIn] += partialIn;
    currentReserves[tokenOut] -= partialOut;
    remainingInput -= partialIn;

    const tickIndex = currentTicks.findIndex((tick) => tick.id === crossingTick.id);
    currentTicks[tickIndex] = {
      ...currentTicks[tickIndex],
      state:
        currentTicks[tickIndex].state === TickState.INTERIOR
          ? TickState.BOUNDARY
          : TickState.INTERIOR,
    };
  }

  return { totalOutput, segments };
}

function findCrossingTick(
  newAlphaIntNorm: bigint,
  interiorTicks: Tick[],
  boundaryTicks: Tick[],
): Tick | null {
  let closestInterior: Tick | null = null;
  let closestInteriorKNorm = 0n;

  for (const tick of interiorTicks) {
    const kNorm = (tick.k * PRECISION) / tick.r;
    if (newAlphaIntNorm >= kNorm) {
      if (closestInterior === null || kNorm < closestInteriorKNorm) {
        closestInterior = tick;
        closestInteriorKNorm = kNorm;
      }
    }
  }

  let closestBoundary: Tick | null = null;
  let closestBoundaryKNorm = 0n;

  for (const tick of boundaryTicks) {
    const kNorm = (tick.k * PRECISION) / tick.r;
    if (newAlphaIntNorm <= kNorm) {
      if (closestBoundary === null || kNorm > closestBoundaryKNorm) {
        closestBoundary = tick;
        closestBoundaryKNorm = kNorm;
      }
    }
  }

  return closestInterior ?? closestBoundary;
}

function findCrossingPoint(
  maxInput: bigint,
  tokenIn: number,
  tokenOut: number,
  reserves: bigint[],
  n: number,
  consol: ConsolidationResult,
  crossingTick: Tick,
  sqrtN: bigint,
  invSqrtN: bigint,
): { partialIn: bigint; partialOut: bigint } {
  const targetKNorm = (crossingTick.k * PRECISION) / crossingTick.r;

  let lo = 0n;
  let hi = maxInput;

  const { sumX, sumXSq } = computeAggregates(reserves);

  for (let iteration = 0; iteration < 64; iteration += 1) {
    const mid = (lo + hi) / 2n;
    if (mid === lo) break;

    let delta: bigint;
    try {
      delta = solveSwapNewton(
        mid,
        tokenIn,
        tokenOut,
        reserves,
        n,
        consol.rInt,
        consol.sBound,
        consol.kBound,
        sqrtN,
        invSqrtN,
        sumX,
        sumXSq,
      );
    } catch {
      hi = mid;
      continue;
    }

    const newReserves = [...reserves];
    newReserves[tokenIn] += mid;
    newReserves[tokenOut] -= delta;
    const { sumX: newSumX } = computeAggregates(newReserves);
    const alphaIntNorm = normalizedInteriorProjection(
      newSumX,
      invSqrtN,
      consol.kBound,
      consol.rInt,
    );

    if (crossingTick.state === TickState.INTERIOR) {
      if (alphaIntNorm >= targetKNorm) {
        hi = mid;
      } else {
        lo = mid;
      }
    } else if (alphaIntNorm <= targetKNorm) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return {
    partialIn: hi,
    partialOut: solveSwapNewton(
      hi,
      tokenIn,
      tokenOut,
      reserves,
      n,
      consol.rInt,
      consol.sBound,
      consol.kBound,
      sqrtN,
      invSqrtN,
      sumX,
      sumXSq,
    ),
  };
}
