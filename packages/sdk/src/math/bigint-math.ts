/**
 * Integer square root using Newton's method.
 * Returns floor(sqrt(n)).
 */
export function sqrt(n: bigint): bigint {
  if (n < 0n) throw new Error("sqrt of negative number");
  if (n === 0n) return 0n;
  if (n === 1n) return 1n;

  let x = n;
  let y = (x + 1n) / 2n;

  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }

  return x;
}

export function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

export function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function div(a: bigint, b: bigint): bigint {
  if (b === 0n) throw new Error("Division by zero");
  return a / b;
}

export function mulScaled(a: bigint, b: bigint, precision: bigint): bigint {
  return (a * b) / precision;
}

export function divScaled(a: bigint, b: bigint, precision: bigint): bigint {
  if (b === 0n) throw new Error("Division by zero");
  return (a * precision) / b;
}

export function clamp(val: bigint, lo: bigint, hi: bigint): bigint {
  if (val < lo) return lo;
  if (val > hi) return hi;
  return val;
}
