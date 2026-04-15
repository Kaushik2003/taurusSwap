export interface TorusParams {
  R: number; // major radius
  r: number; // minor (tube) radius
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function lerpParams(a: TorusParams, b: TorusParams, t: number): TorusParams {
  return { R: lerp(a.R, b.R, t), r: lerp(a.r, b.r, t) };
}

/**
 * Map live (s_bound, r_int) — which may span many orders of magnitude —
 * to a visually stable torus.
 *   R ∈ [2.0, 4.0]  — overall pool size
 *   r ∈ [0.3, 1.2]  — tube / interior depth
 */
export function buildTorus(sBound: number, rInt: number): TorusParams {
  const safeS = sBound > 0 ? sBound : 1;
  const safeR = rInt > 0 ? rInt : 0.1;
  const scale = 3.0 / safeS;
  return {
    R: clamp(safeS * scale, 2.0, 4.0),
    r: clamp(safeR * scale, 0.3, 1.2),
  };
}

/** atan2 of (y, x) — current reserve ratio as an angle on the torus. */
export function reserveToAngle(rx: number, ry: number): number {
  return Math.atan2(ry, rx);
}

/** Point on the torus surface at (theta, phi) given (R, r). */
export function torusPoint(
  theta: number,
  phi: number,
  R: number,
  r: number,
): [number, number, number] {
  const rim = R + r * Math.cos(phi);
  return [rim * Math.cos(theta), r * Math.sin(phi), rim * Math.sin(theta)];
}

/** Scientific notation formatting matching the bottom-bar readout style. */
export function formatSci(x: number, digits = 2): string {
  if (!isFinite(x) || x === 0) return '0.00e+0';
  return x.toExponential(digits);
}

/** True if two torus param pairs differ enough to justify a geometry rebuild. */
export function shouldRebuild(
  a: TorusParams,
  b: TorusParams,
  eps = 0.008,
): boolean {
  return Math.abs(a.R - b.R) > eps || Math.abs(a.r - b.r) > eps;
}
