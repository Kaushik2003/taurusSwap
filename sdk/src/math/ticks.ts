import { PRECISION } from "../constants";
import { divScaled, mulScaled, sqrt } from "./bigint-math";
import { equalPricePoint } from "./sphere";

export function kMin(r: bigint, sqrtN: bigint): bigint {
  return mulScaled(r, sqrtN - PRECISION, PRECISION);
}

export function kMax(r: bigint, n: number, sqrtN: bigint): bigint {
  return divScaled(r * BigInt(n - 1), sqrtN, PRECISION);
}

export function xMin(r: bigint, k: bigint, n: number, sqrtN: bigint): bigint {
  const N = BigInt(n);
  const c = N * r - mulScaled(k, sqrtN, PRECISION);
  const nR2 = N * r * r;
  const c2 = c * c;
  const disc = (N - 1n) * (nR2 - c2);

  if (disc < 0n) {
    throw new Error(`Invalid tick parameters: discriminant negative (r=${r}, k=${k}, n=${n})`);
  }

  return r - (c + sqrt(disc)) / N;
}

export function xMax(r: bigint, k: bigint, n: number, sqrtN: bigint): bigint {
  const N = BigInt(n);
  const c = N * r - mulScaled(k, sqrtN, PRECISION);
  const nR2 = N * r * r;
  const c2 = c * c;
  const disc = (N - 1n) * (nR2 - c2);

  if (disc < 0n) {
    throw new Error("Invalid tick parameters: discriminant negative");
  }

  const xmax = r - (c - sqrt(disc)) / N;
  return xmax > r ? r : xmax;
}

export function virtualReserves(
  r: bigint,
  k: bigint,
  n: number,
  sqrtN: bigint,
): bigint {
  return xMin(r, k, n, sqrtN);
}

export function capitalEfficiency(
  r: bigint,
  k: bigint,
  n: number,
  sqrtN: bigint,
  invSqrtN: bigint,
): number {
  const q = equalPricePoint(r, invSqrtN);
  const xmin = xMin(r, k, n, sqrtN);
  const denominator = q - xmin;

  if (denominator <= 0n) return Number.POSITIVE_INFINITY;

  return Number(q) / Number(denominator);
}

export function kFromDepegPrice(
  depegPrice: number,
  r: bigint,
  n: number,
  sqrtN: bigint,
  _invSqrtN: bigint,
): bigint {
  const kLo = kMin(r, sqrtN);
  const kHi = kMax(r, n, sqrtN);

  let lo = kLo;
  let hi = kHi;

  for (let iteration = 0; iteration < 64; iteration += 1) {
    const mid = (lo + hi) / 2n;
    const xMaxVal = xMax(r, mid, n, sqrtN);
    const N = BigInt(n);
    const kSqrtN = mulScaled(mid, sqrtN, PRECISION);
    const xOther = (kSqrtN - xMaxVal) / (N - 1n);
    const numerator = r - xOther;
    const denominator = r - xMaxVal;

    if (denominator <= 0n) {
      lo = mid;
      continue;
    }

    const price = Number(numerator) / Number(denominator);
    if (price > depegPrice) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2n;
}
