# 2. Mathematical Foundations

> **Video explainer:** See the animated visual walkthrough of these concepts:
> - [Sphere AMM Animation](assets/01_sphere_amm.mp4) -- 3D sphere with reserve dynamics
> - [Polar Decomposition Animation](assets/02_polar_decomposition.mp4) -- alpha and w component visualization

This document builds the core math from first principles. If you understand these foundations, everything else in TaurusSwap follows.

## 2.1 The Sphere AMM Invariant

Every AMM has a constant function — an equation that reserves must satisfy after every trade. For Uniswap V2 it's `x * y = k`. For TaurusSwap, it's a **sphere**.

### The equation

```
Σᵢ (r - xᵢ)² = r²
```

This is the surface of a sphere in n-dimensional space:
- **Center:** `(r, r, ..., r)` — the point where every coordinate equals the radius
- **Radius:** `r`
- **Surface:** all points `x` satisfying the equation above

Reserves `x = (x₁, x₂, ..., xₙ)` must always lie on this surface. Trades move the reserve point along the sphere's surface.

### Why this center?

Placing the center at `(r, r, ..., r)` ensures:
- The point `(0, r, r, ..., r)` is on the sphere — representing full depeg of one token (reserves = 0)
- All reserves stay in the range `[0, r]`
- The geometry is symmetric across all tokens

**Verification:** If `x = (0, r, r, ..., r)`:
```
(r - 0)² + (r - r)² + ... + (r - r)² = r² + 0 + ... + 0 = r²  ✓
```

## 2.2 Token Pricing

When a trader swaps token i for token j, the reserve point slides along the sphere surface. Using implicit differentiation on the constraint:

```
price(Xⱼ / Xᵢ) = (r - xᵢ) / (r - xⱼ)
```

**Intuition:**
- If the pool has **lots** of token i (xᵢ close to r), then `(r - xᵢ)` is small → token j is cheap relative to i (the pool is flooded with i)
- If token i is **scarce** (xᵢ far from r), then `(r - xᵢ)` is large → token j costs more of token i

This is the same supply-demand intuition as `x * y = k`, just expressed on a sphere.

### Fixed-point implementation

On-chain, all math uses integer arithmetic with `PRECISION = 10⁹`:

```python
price_scaled = ((r_scaled - reserves[i]) * PRECISION) // (r_scaled - reserves[j])
```

## 2.3 The Equal-Price Point

The **equal-price point** `q` is where all reserves are identical: `q = (q, q, ..., q)`. At this point, all token prices are 1:1 — the perfect peg.

### Derivation

Substituting `xᵢ = q` for all i into the sphere equation:

```
n · (r - q)² = r²
(r - q)² = r²/n
r - q = r/√n
q = r · (1 - 1/√n)
```

For a 5-token pool with r = 18,000:
```
q = 18,000 × (1 - 1/√5) = 18,000 × 0.5528 ≈ 9,950
```

Each token holds ~9,950 units at the peg.

## 2.4 The Direction Vector v

Define the unit vector pointing from the origin toward the equal-price direction:

```
v = (1/√n, 1/√n, ..., 1/√n)
```

This vector has unit length: `‖v‖ = √(n · 1/n) = 1`.

**Physical meaning:**
- Movement **along** v = all reserves change equally (total value shift, not a trade)
- Movement **orthogonal** to v = one reserve goes up, another goes down (a trade)

## 2.5 Polar Reserve Decomposition

Any reserve state `x` on the sphere decomposes into two components:

```
x = α · v + w       where w ⊥ v
```

- **α** (alpha) = scalar projection onto v = `Σxᵢ / √n`
- **w** = orthogonal component = the "trading" part of reserves

### Computing without constructing w explicitly

The key computational insight: you never need to build the w vector. Its squared norm is:

```
‖w‖² = Σxᵢ² - (Σxᵢ)²/n
```

This is the **variance formula**. It means the entire torus invariant depends on just two aggregates:

| Aggregate | Update cost for a 2-token swap |
|-----------|-------------------------------|
| `Σxᵢ` (sum of reserves) | O(1): `new_sum = old_sum + d_in - d_out` |
| `Σxᵢ²` (sum of squares) | O(1): update only the two changed terms |

This is why verification is O(1) regardless of n.

### The sphere constraint in polar form

Substituting the decomposition into the sphere equation:

```
(α - r√n)² + ‖w‖² = r²
```

At constant α, the reserves lie on a (n-1)-dimensional sphere of radius:

```
s = √(r² - (α - r√n)²)
```

in the subspace orthogonal to v.

## 2.6 Notation Summary

| Symbol | Meaning | How to compute |
|--------|---------|----------------|
| n | Number of tokens | Pool parameter |
| r | Sphere radius | Pool/tick parameter |
| xᵢ | Reserves of token i | Stored in box storage |
| v | Equal-price direction | `(1/√n, ..., 1/√n)` |
| α | Projection onto v | `Σxᵢ / √n` |
| w | Orthogonal component | `x - αv` (never computed explicitly) |
| ‖w‖² | Squared norm of w | `Σxᵢ² - (Σxᵢ)²/n` |
| q | Equal-price point | `r(1 - 1/√n)` per token |
| k | Tick plane constant | LP parameter defining depeg tolerance |
| PRECISION | Fixed-point scale | `10⁹` |
| AMOUNT_SCALE | Raw→scaled divisor | `1,000` |

## 2.7 Implementation Reference

The Python reference implementation lives in `contracts/orbital_math/`:

| File | Functions |
|------|-----------|
| `sphere.py` | `equal_price_point()`, `sphere_residual()`, `spot_price()` |
| `polar.py` | `alpha_total()`, `w_norm_sq_from_sums()`, `polar_decompose()` |
| `constants.py` | `PRECISION`, `ROOT_PRECISION`, `TOLERANCE` |
| `fixed_point.py` | `isqrt()`, `mul_div_round()`, `normalized_square()` |

The TypeScript SDK mirrors this in `sdk/src/math/`:

| File | Functions |
|------|-----------|
| `sphere.ts` | `equalPricePoint()`, `sphereInvariant()`, `getPrice()` |
| `bigint-math.ts` | `sqrt()`, `mulScaled()`, `divScaled()` |
