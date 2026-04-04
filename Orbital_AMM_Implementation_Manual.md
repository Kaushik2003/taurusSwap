# Orbital AMM: Complete Implementation Manual

**Target Platform:** Algorand (AVM / Algorand Python)
**Source Paper:** "Orbital" by Dave White, Dan Robinson, Ciamac Moallemi — Paradigm (June 2, 2025)
**Paper URL:** https://www.paradigm.xyz/2025/06/orbital

---

## Table of Contents

1. [What Is Orbital](#1-what-is-orbital)
2. [Prerequisites](#2-prerequisites)
3. [Mathematical Foundations](#3-mathematical-foundations)
4. [The Sphere AMM](#4-the-sphere-amm)
5. [Token Pricing](#5-token-pricing)
6. [The Equal Price Point](#6-the-equal-price-point)
7. [Polar Reserve Decomposition](#7-polar-reserve-decomposition)
8. [Tick Definition and Geometry](#8-tick-definition-and-geometry)
9. [Tick Size Bounds](#9-tick-size-bounds)
10. [Reserve Bounds and Virtual Reserves](#10-reserve-bounds-and-virtual-reserves)
11. [Capital Efficiency](#11-capital-efficiency)
12. [Tick Consolidation](#12-tick-consolidation)
13. [The Global Trade Invariant (The Torus)](#13-the-global-trade-invariant-the-torus)
14. [Computing Trades Within Tick Boundaries](#14-computing-trades-within-tick-boundaries)
15. [Crossing Ticks](#15-crossing-ticks)
16. [Algorand Architecture: Compute Off-Chain, Verify On-Chain](#16-algorand-architecture)
17. [Smart Contract Implementation](#17-smart-contract-implementation)
18. [Off-Chain SDK Implementation](#18-off-chain-sdk-implementation)
19. [Frontend Implementation](#19-frontend-implementation)
20. [Testing Strategy](#20-testing-strategy)
21. [Deployment Guide](#21-deployment-guide)
22. [Quick Reference: All Formulas](#22-quick-reference-all-formulas)

---

## 1. What Is Orbital

Orbital is an automated market maker (AMM) designed for pools of n stablecoins, where n can be 2, 3, or even 10,000. It solves two problems that existing AMMs cannot solve simultaneously:

**Problem 1: Multi-asset pools.** Uniswap V3 has concentrated liquidity but only supports 2 tokens per pool. If you have 5 stablecoins, you need 10 separate pools (every pair), fragmenting liquidity.

**Problem 2: Concentrated liquidity in higher dimensions.** Curve supports n-token pools but forces all liquidity providers (LPs) to use the same uniform liquidity profile. There is no way for one LP to say "I only want to provide liquidity near the $1 price point" while another provides wider coverage.

**Orbital's solution:** Use the surface of an n-dimensional sphere as the AMM invariant. Tick boundaries become spherical caps (circles on the sphere surface) centered at the equal-price point. These ticks are nested — larger ticks contain smaller ticks. Thanks to geometric symmetry, all interior ticks can be consolidated into one sphere, and all boundary ticks into another (lower-dimensional) sphere. The combination of these two spheres forms a torus (donut shape), whose equation can be evaluated in constant time regardless of n.

**Key result:** For a 5-token pool with a tick boundary at a $0.99 depeg price, Orbital provides approximately 150x capital efficiency compared to an equivalent Curve pool.

---

## 2. Prerequisites

### Mathematical Background Needed
- Basic linear algebra: vectors, dot products, norms, projections
- Understanding of what a sphere surface looks like in n dimensions
- Familiarity with implicit differentiation (for pricing)
- Understanding of quadratic and quartic equations

### Technical Background Needed
- Smart contract development (Algorand Python preferred)
- TypeScript/JavaScript for the off-chain SDK
- Understanding of how AMMs work (constant function market makers)
- Familiarity with Algorand: ASAs, box storage, atomic groups, inner transactions, opcode budgets

### Development Tools
- AlgoKit CLI (Algorand development framework)
- Algorand Python (PuyaPy compiler)
- Node.js + algosdk (TypeScript SDK)
- Python 3.10+ for testing and simulation
- React + Three.js for frontend (optional but impressive for demos)

---

## 3. Mathematical Foundations

### Notation Used Throughout This Document

| Symbol | Meaning |
|--------|---------|
| n | Number of tokens in the pool |
| x = (x₁, x₂, ..., xₙ) | Reserve vector — xᵢ is the pool's reserves of token i |
| r | Radius of a sphere AMM (or a specific tick's sphere) |
| ‖·‖ | Euclidean norm: ‖a‖ = sqrt(a₁² + a₂² + ... + aₙ²) |
| v | Unit vector pointing from origin toward equal-price point: v = (1/√n, 1/√n, ..., 1/√n) |
| α | Scalar projection of reserve vector onto v: α = x · v |
| w | Component of reserve vector orthogonal to v: w = x - αv |
| k | Plane constant defining a tick boundary |
| q | The equal-price point: q = r(1 - 1/√n)(1,1,...,1) |
| F(x) | The AMM's constant function: ‖r⃗ - x‖² = r² |

### Key Insight to Keep in Mind

The sphere AMM's state lives on the surface of an n-dimensional sphere. The sphere is centered at the point r⃗ = (r, r, ..., r) — that is, the point where every coordinate equals the radius. The sphere has radius r. So the surface of the sphere is all points x satisfying:

    (r - x₁)² + (r - x₂)² + ... + (r - xₙ)² = r²

Reserves move along this surface as trades happen. The "equal price point" is where all reserves are equal, and it sits on the sphere surface at a specific distance from the center along the diagonal direction.

---

## 4. The Sphere AMM

### 4.1 The Invariant Formula

The core of Orbital is the Sphere AMM. The invariant is:

    ‖r⃗ - x‖² = r²

Expanded:

    Σᵢ₌₁ⁿ (r - xᵢ)² = r²

where:
- xᵢ is the pool's current reserves of token i
- r is the AMM's radius parameter (set at pool creation)
- r⃗ = (r, r, ..., r) is the center of the sphere

This is the equation of a sphere of radius r centered at (r, r, ..., r) in n-dimensional space.

### 4.2 Why This Center?

The center is placed at (r, r, ..., r) so that the sphere surface passes through the origin (0, 0, ..., 0). You can verify: ‖(r,r,...,r) - (0,0,...,0)‖² = n·r² ≠ r² for n > 1, so the origin is NOT on the sphere. However, points with one coordinate at 0 and others at r ARE on the sphere (this represents full depeg of one token).

Check: if x = (0, r, r, ..., r) (n-1 coordinates equal to r, one equal to 0):
    (r - 0)² + (r - r)² + ... + (r - r)² = r² + 0 + ... + 0 = r² ✓

### 4.3 Reserve Bounds

From the sphere equation, the maximum value any reserve xᵢ can take is r (when xᵢ = r and the corresponding term (r - xᵢ)² = 0). The minimum is 0 (when (r - xᵢ)² = r², requiring all other terms to be 0).

However, if all token prices are positive, no-arbitrage implies xᵢ ≤ r for all i, because if xᵢ exceeded r, a trader could remove tokens for free without violating the constraint.

### 4.4 Implementation Note: Fixed-Point Representation

On-chain, we cannot use floating point. Choose a PRECISION_FACTOR (e.g., 10¹⁸ or 10⁶ depending on the platform). All reserves and the radius are stored as integers scaled by this factor.

For Algorand with uint64:
- Use PRECISION = 10⁹ (gives 9 decimal places, fits in uint64 for reasonable pool sizes)
- r_scaled = r * PRECISION
- x_scaled = x * PRECISION
- When computing (r - xᵢ)², the result is in PRECISION² units; divide by PRECISION after summing

For larger pools or higher precision, use Algorand's byte-math (bsqrt, b*, b+, b-) which supports up to 512-bit integers.

---

## 5. Token Pricing

### 5.1 Instantaneous Price Derivation

When a trader gives the AMM some amount of token Xᵢ and takes out some of token Xⱼ, we must stay on the sphere surface. Using implicit differentiation on the constraint F(x) = ‖r⃗ - x‖² = r²:

    ∂F/∂xᵢ = -2(r - xᵢ)
    ∂F/∂xⱼ = -2(r - xⱼ)

For a trade that changes xᵢ by δxᵢ and xⱼ by δxⱼ while staying on the surface:

    (∂F/∂xᵢ)·δxᵢ + (∂F/∂xⱼ)·δxⱼ = 0

Solving:

    δxⱼ/δxᵢ = -(∂F/∂xᵢ)/(∂F/∂xⱼ) = -(r - xᵢ)/(r - xⱼ)

The instantaneous price of token Xⱼ in terms of token Xᵢ is:

    price(Xⱼ/Xᵢ) = (r - xᵢ) / (r - xⱼ)

### 5.2 Price Intuition

If the AMM has HIGH reserves of Xᵢ (xᵢ close to r), then (r - xᵢ) is SMALL, meaning the price of Xⱼ relative to Xᵢ is LOW — the AMM doesn't give you much Xⱼ per unit of Xᵢ. This makes sense: if the pool is flooded with Xᵢ, it's cheap.

Conversely, if xᵢ is LOW (far from r), (r - xᵢ) is LARGE, and the AMM gives more Xⱼ per Xᵢ.

### 5.3 Implementation

```
function get_price(token_i, token_j, reserves, r):
    return (r - reserves[token_i]) / (r - reserves[token_j])
```

On-chain in fixed-point:
```
price_scaled = ((r_scaled - reserves[i]) * PRECISION) / (r_scaled - reserves[j])
```

---

## 6. The Equal Price Point

### 6.1 Derivation

The equal price point is where all reserves are identical: q = (q, q, ..., q) for some value q. By symmetry, all prices are 1:1 at this point. Substituting into the sphere constraint:

    Σᵢ₌₁ⁿ (r - q)² = r²
    n · (r - q)² = r²
    (r - q)² = r²/n
    r - q = r/√n      (taking positive root since q < r)
    q = r(1 - 1/√n)

### 6.2 The Unit Direction Vector

There is a line from the origin through the equal price point to the sphere center (r, r, ..., r). We define the unit vector along this direction:

    v = (1/√n, 1/√n, ..., 1/√n)

This vector has unit length: ‖v‖ = √(n · 1/n) = 1.

In terms of trading, v represents a portfolio holding 1/n of each token. Movement along v means all token reserves increase or decrease equally. Movement orthogonal to v means one token's reserves go up while another's go down (a trade).

### 6.3 Implementation

```
# Equal price point for a pool with radius r and n tokens
q = r * (1 - 1 / sqrt(n))

# Each token's reserves at the equal price point
reserve_at_equal = q  # same for all tokens

# The v vector doesn't need to be stored explicitly;
# projecting x onto v is just: alpha = sum(x) / sqrt(n)
# Or equivalently: alpha = sum(x) * inv_sqrt_n
```

---

## 7. Polar Reserve Decomposition

### 7.1 The Decomposition

Any reserve state x on the sphere can be decomposed into:
- A component parallel to v (the "equal-price direction")
- A component orthogonal to v (the "trading direction")

    x = α·v + w    where w ⊥ v

Computing α (the scalar projection):

    α = x · v = (1/√n) · Σᵢ xᵢ = sum_of_reserves / √n

Computing w (the orthogonal component):

    w = x - α·v

### 7.2 The Constraint in Polar Form

Substituting x = αv + w into the sphere constraint:

    ‖r⃗ - x‖² = ‖(r√n·v) - (αv + w)‖²
             = ‖(r√n - α)v - w‖²
             = (r√n - α)² · ‖v‖² + ‖w‖²     (since v ⊥ w)
             = (r√n - α)² + ‖w‖²              (since ‖v‖ = 1)
    
    Setting equal to r²:
    (α - r√n)² + ‖w‖² = r²

Rearranging:

    ‖w‖² = r² - (α - r√n)²

### 7.3 Key Insight

If we hold α constant (the component along v), the reserves are constrained to a sphere of radius s in the subspace orthogonal to v, where:

    s = √(r² - (α - r√n)²)

This is a (n-1)-dimensional sphere. Holding α constant and varying w means we're trading tokens while keeping the total portfolio value (in the equal-weighted sense) fixed.

### 7.4 Implementation

```
function polar_decompose(x, n):
    sum_x = sum(x[i] for i in range(n))
    sqrt_n = sqrt(n)
    alpha = sum_x / sqrt_n
    
    # w components: w_i = x_i - alpha/sqrt_n = x_i - sum_x/n
    w = [x[i] - sum_x/n for i in range(n)]
    
    # ‖w‖² = Σ w_i²
    w_norm_sq = sum(w[i]**2 for i in range(n))
    
    return alpha, w, w_norm_sq
```

Note: You can also compute ‖w‖² without explicitly constructing w:

    ‖w‖² = Σxᵢ² - (Σxᵢ)²/n

This is the variance formula, and it's important because it means you only need to track:
- sum_x = Σxᵢ  
- sum_x_sq = Σxᵢ²

These two aggregates are sufficient to compute the invariant, and updating them for a trade involving tokens i and j is O(1).

---

## 8. Tick Definition and Geometry

### 8.1 What Is a Tick?

A tick is a region of the sphere's surface near the equal price point. Geometrically, it's a spherical cap — the part of the sphere surface that lies on one side of a cutting hyperplane.

**Key difference from Uniswap V3:** In Uniswap V3, ticks are disjoint intervals on a 1D price axis. In Orbital, ticks are nested spherical caps that all share the same center (the equal price point). Larger ticks fully contain smaller ticks.

### 8.2 Tick Boundary as a Hyperplane

A tick boundary is defined by a hyperplane perpendicular to v:

    x · v = k

for some constant k. This hyperplane intersects the sphere, creating a circle (in 3D) or an (n-2)-dimensional sphere (in nD) on the sphere's surface. All points on this boundary are equidistant (in geodesic distance) from the equal price point.

Points satisfying x · v < k are "inside" the tick (closer to the equal price point). Points satisfying x · v = k are "on the boundary." Points with x · v > k are "outside" — they represent prices that have diverged too far for this tick.

### 8.3 Interior vs. Boundary Ticks

At any given time, a tick is in one of two states:

**Interior:** The current reserve state has x · v < k. The tick's reserves are somewhere on the interior of the spherical cap. The tick behaves like a full spherical AMM.

**Boundary:** The current reserve state has x · v = k. Prices have diverged enough that the tick's reserves are pinned to its boundary circle. The tick behaves like a lower-dimensional spherical AMM (an (n-1)-dimensional sphere in the subspace orthogonal to v).

### 8.4 Tick Parameters

Each tick is defined by two parameters:
- **r** (radius): Controls the tick's total liquidity. Larger r = more liquidity.
- **k** (plane constant): Controls how far from the equal price point the tick extends. Larger k = wider coverage (handles more depeg).

### 8.5 Implementation: Tick Data Structure

```
struct Tick:
    r: uint64          # Radius (scaled by PRECISION)
    k: uint64          # Plane constant (scaled by PRECISION)
    state: enum        # INTERIOR or BOUNDARY
    liquidity: uint64  # LP shares
    lp_address: bytes  # Owner (for single-LP simplification)
```

Store ticks in box storage on Algorand:
- Box name: `tick:{tick_id}` (e.g., `tick:0`, `tick:1`, ...)
- Box contents: ABI-encoded Tick struct

---

## 9. Tick Size Bounds

### 9.1 The Minimal Tick (k_min)

The smallest possible tick has its boundary at the equal price point itself. At the equal price point q = (q, q, ..., q):

    k_min = q · v = n·q / √n = q·√n = r(√n - 1)

A tick with k = k_min has zero width and provides no liquidity. It represents the theoretical lower bound.

### 9.2 The Maximal Tick (k_max)

The largest tick's boundary passes through the point where one reserve is 0 and all others are at their maximum value r. Consider x = (0, r, r, ..., r):

    k_max = x · v = (0 + (n-1)·r) / √n = r(n-1)/√n

This tick covers the entire valid region of the sphere. A tick with k = k_max provides liquidity even when a single stablecoin depegs all the way to $0.

### 9.3 Valid Range for k

Any tick must have k in the range:

    r(√n - 1) ≤ k ≤ r(n-1)/√n

### 9.4 Implementation

```
function k_min(r, n):
    return r * (sqrt(n) - 1)

function k_max(r, n):
    return r * (n - 1) / sqrt(n)
```

---

## 10. Reserve Bounds and Virtual Reserves

### 10.1 Minimum Reserve per Token (x_min)

Given a tick with plane constant k, what is the minimum reserves any single token can have? By symmetry, when one token hits its minimum, all other tokens must be equal. Setting up the system:

**Sphere constraint:**
    (r - x_min)² + (n-1)(r - x_other)² = r²

**Plane constraint:**
    (x_min + (n-1)·x_other) / √n = k

From the plane constraint:
    x_other = (k·√n - x_min) / (n-1)

Substituting into the sphere constraint and solving the resulting quadratic:

    x_min = (k√n - √(k²n - n(n-1)·(r - k/√n)²)) / n

Simplified form:

    x_min = (k√n)/n - √((k²n)/n² - (n-1)/n · (r - k/√n)²)
    x_min = k/√n - √((k/√n)² - (n-1)/n · (r - k/√n)²) ... [see clean form below]

**Clean computational form:**

Let:
    a = k/√n     (= k · inv_sqrt_n)
    b = r - a    (= r - k/√n, the distance from α=k/√n to the sphere center's projection)

Then:
    x_min = a - √(a² - (n-1)/n · b²) ... [this is not quite right; let me derive cleanly]

**Careful re-derivation:**

We have two equations:
1. (r - x_min)² + (n-1)(r - x_other)² = r²
2. x_min + (n-1)·x_other = k·√n

From (2): x_other = (k√n - x_min)/(n-1)

Plug into (1):
    (r - x_min)² + (n-1)·(r - (k√n - x_min)/(n-1))² = r²

Let u = r - x_min, so x_min = r - u
    x_other = (k√n - r + u)/(n-1)
    r - x_other = r - (k√n - r + u)/(n-1) = ((n-1)r - k√n + r - u)/(n-1) = (nr - k√n - u)/(n-1)

So:
    u² + (n-1)·((nr - k√n - u)/(n-1))² = r²
    u² + (nr - k√n - u)²/(n-1) = r²

Let c = nr - k√n. Then:
    u² + (c - u)²/(n-1) = r²
    (n-1)u² + c² - 2cu + u² = (n-1)r²
    nu² - 2cu + c² - (n-1)r² = 0

By the quadratic formula:
    u = (2c ± √(4c² - 4n(c² - (n-1)r²))) / (2n)
    u = (c ± √(c² - n·c² + n(n-1)r²)) / n
    u = (c ± √((1-n)c² + n(n-1)r²)) / n
    u = (c ± √((n-1)(nr² - c²))) / n
    u = (c ± √((n-1)·(nr² - (nr - k√n)²))) / n

Since u = r - x_min, and x_min is the MINIMUM reserve:
    x_min = r - u_max (take the minus sign for u to be largest, giving smallest x_min)

    u_max = (c + √((n-1)(nr² - c²))) / n

    x_min = r - (c + √((n-1)(nr² - c²))) / n

where c = nr - k√n.

**Final clean formula:**

    c = n·r - k·√n
    x_min = r - (c + √((n-1)·(n·r² - c²))) / n

### 10.2 Virtual Reserves

Since reserves can never go below x_min, the LP doesn't need to actually deposit x_min worth of each token. These are "virtual reserves" — they exist mathematically but not physically. The LP only deposits the difference between the equal-price reserves and x_min.

    virtual_reserves_per_token = x_min(k)

    actual_deposit_per_token = q - x_min(k)
    (where q = r(1 - 1/√n) is the reserve at equal price)

### 10.3 Maximum Reserve per Token (x_max)

Similarly, the maximum reserve (when one token depegs and traders dump it into the pool):

    x_max = min(r, r - (c - √((n-1)·(n·r² - c²))) / n)

And the corresponding reserves of the other tokens:

    x_other_at_max = (k·√n - x_max) / (n-1)

### 10.4 Implementation

```
function compute_x_min(r, k, n):
    sqrt_n = sqrt(n)
    c = n * r - k * sqrt_n
    discriminant = (n - 1) * (n * r * r - c * c)
    assert discriminant >= 0, "Invalid tick parameters"
    x_min = r - (c + sqrt(discriminant)) / n
    return x_min

function compute_x_max(r, k, n):
    sqrt_n = sqrt(n)
    c = n * r - k * sqrt_n
    discriminant = (n - 1) * (n * r * r - c * c)
    x_max_candidate = r - (c - sqrt(discriminant)) / n
    return min(r, x_max_candidate)

function compute_virtual_reserves(r, k, n):
    return compute_x_min(r, k, n)
```

---

## 11. Capital Efficiency

### 11.1 The Capital Efficiency Ratio

The capital efficiency gain is:

    capital_efficiency = x_base / (x_base - x_min(k))

where x_base = q = r(1 - 1/√n) is the per-token reserves at the equal price point.

### 11.2 Mapping k to a Depeg Price

If we assume the most likely failure mode is a single token depegging while all others hold at $1, we can compute the depeg price at which the tick boundary kicks in.

The depegged token will have reserves x_depeg = x_max(k), and the other tokens have reserves x_other.

The depeg price relative to the stable tokens is:

    p_depeg = (r - x_other) / (r - x_depeg)

### 11.3 Computing k from a Desired Depeg Price

Given a target depeg price p, compute the k that triggers the boundary at that price:

    k_depeg(p) = r·√n - √(n · (n-1) · r²) / √(p² + n - 1) · ... [complex expression]

The paper gives:

    k_depeg(p) = r√n - √(n · ((p_depeg · r√n)/(p_depeg + n - 1))² · ... )

**Simplified computational form** (for implementation):

    k_depeg(p) = r·√n - r·√n · √((n-1)/(p² + n - 1)) · ... 

Actually, the cleanest approach for implementation is to use binary search: given a target depeg price p, binary search over k values and for each k, compute the actual depeg price and converge.

```
function k_from_depeg_price(p_target, r, n, tolerance=1e-12):
    k_lo = k_min(r, n)
    k_hi = k_max(r, n)
    while k_hi - k_lo > tolerance:
        k_mid = (k_lo + k_hi) / 2
        p_mid = depeg_price_at_k(k_mid, r, n)
        if p_mid > p_target:
            k_lo = k_mid  # need wider tick
        else:
            k_hi = k_mid
    return (k_lo + k_hi) / 2
```

### 11.4 Example Capital Efficiency Numbers

For n = 5 tokens:

| Depeg Price Limit | Approximate Capital Efficiency |
|-------------------|-------------------------------|
| $0.99             | ~150x                         |
| $0.95             | ~30x                          |
| $0.90             | ~15x                          |
| $0.50             | ~3x                           |

These numbers mean: an LP in a $0.99 depeg tick needs only 1/150th of the capital that a Curve LP needs to provide the same depth of liquidity, as long as no token depegs below $0.99.

---

## 12. Tick Consolidation

### 12.1 Why Consolidate?

A full Orbital AMM has many ticks with different k values. Computing trades across all of them individually would be expensive. The key insight is that ticks in the same state (interior or boundary) can be consolidated into a single effective tick.

### 12.2 Case 1: Both Ticks Interior

If two ticks Tₐ and T_b are both interior (reserves not on their boundary), then:

- By no-arbitrage, their normalized reserve vectors must be parallel (otherwise there'd be a price difference to arbitrage)
- Since their centers are both at rₐ·v and r_b·v respectively, and rₐ - xₐ is parallel to r_b - x_b, the combined reserves scale linearly with radius
- They behave as a single spherical AMM with radius:

    r_c = rₐ + r_b

**Extension to many ticks:** All interior ticks consolidate to a single sphere with:

    r_int = Σ rᵢ  (for all interior ticks i)

### 12.3 Case 2: Both Ticks on Boundary

If both ticks are on their boundaries, any trade must be orthogonal to v (since x · v must remain = k for each tick). The ticks behave as spherical AMMs in the (n-1)-dimensional subspace orthogonal to v.

In this subspace, their centers are both at the origin (projected), and they consolidate to:

    s_c = sₐ + s_b

where sₐ = √(rₐ² - (kₐ - rₐ√n)²) is the boundary tick's effective radius in the orthogonal subspace.

**Extension to many ticks:** All boundary ticks consolidate to a single (n-1)-sphere with:

    s_bound = Σ sᵢ  (for all boundary ticks i)
    where sᵢ = √(rᵢ² - (kᵢ - rᵢ√n)²)

### 12.4 Implementation

```
function consolidate_ticks(ticks, n):
    r_int = 0       # consolidated interior radius
    s_bound = 0     # consolidated boundary radius in orthogonal subspace
    k_bound_total = 0  # sum of k values for boundary ticks
    
    sqrt_n = sqrt(n)
    
    for tick in ticks:
        if tick.state == INTERIOR:
            r_int += tick.r
        else:  # BOUNDARY
            s_i = sqrt(tick.r**2 - (tick.k - tick.r * sqrt_n)**2)
            s_bound += s_i
            k_bound_total += tick.k  # total boundary plane constant
    
    return r_int, s_bound, k_bound_total
```

---

## 13. The Global Trade Invariant (The Torus)

### 13.1 Setup

After consolidation, we have exactly two effective ticks:
1. An interior sphere in full n-dimensional space with radius r_int
2. A boundary sphere in the (n-1)-dimensional subspace orthogonal to v, with radius s_bound

Their combined reserves form the total reserve vector x_total.

### 13.2 Decomposing the Total Reserves

    x_total = x_int + x_bound

Using polar decomposition:
    x_total = α_total · v + w_total
    x_int = α_int · v + w_int
    x_bound = α_bound · v + w_bound

Since boundary reserves satisfy x_bound · v = k_bound:
    α_bound = k_bound

Therefore:
    α_int = α_total - k_bound

### 13.3 Key Fact: w_int is Parallel to w_bound

By no-arbitrage between the interior and boundary ticks in the orthogonal subspace, their orthogonal components must be proportional. This means:

    ‖w_total‖ = ‖w_int‖ + ‖w_bound‖

(Simple addition of norms because they're parallel, not Pythagorean addition.)

### 13.4 Computing ‖w_int‖

    ‖w_int‖ = ‖w_total‖ - ‖w_bound‖
            = ‖w_total‖ - s_bound

where:

    ‖w_total‖ = √(‖x_total‖² - α_total²)
              = √(Σxᵢ² - (Σxᵢ)²/n)

and s_bound was computed during consolidation.

### 13.5 The Full Torus Invariant

The interior tick's sphere invariant is:

    r_int² = (α_int - r_int·√n)² + ‖w_int‖²

Substituting the expressions from above:

    r_int² = (α_total - k_bound - r_int·√n)² + (‖w_total‖ - s_bound)²

**Expanded with observable quantities:**

    r_int² = ((Σxᵢ)/√n - k_bound - r_int·√n)² + (√(Σxᵢ² - (Σxᵢ)²/n) - s_bound)²

### 13.6 Why This Is a Torus

The equation has the form:

    R² = (a - R·√n)² + (‖w‖ - S)²

This is the equation of a generalized torus. A torus is formed by sweeping a circle (the interior sphere's cross-section) around another circle (the boundary sphere). The interior sphere has radius R = r_int, and it's centered at distance S = s_bound from the origin in the orthogonal subspace.

### 13.7 Constant-Time Computation

The invariant can be computed using only:
- Σxᵢ (sum of all reserves)
- Σxᵢ² (sum of squares of all reserves)
- r_int, s_bound, k_bound (consolidation parameters)

Since a trade between tokens i and j changes only xᵢ and xⱼ, updating Σxᵢ and Σxᵢ² requires only:
    new_sum = old_sum + d_i - d_j
    new_sum_sq = old_sum_sq + (x_i + d_i)² - x_i² + (x_j - d_j)² - x_j²

This is O(1) regardless of n.

### 13.8 Implementation

```
function compute_torus_invariant(sum_x, sum_x_sq, n, r_int, s_bound, k_bound):
    """
    Returns the LHS - RHS of the torus equation.
    Should equal 0 for a valid state.
    """
    sqrt_n = sqrt(n)
    alpha_total = sum_x / sqrt_n
    alpha_int = alpha_total - k_bound
    
    # ‖w_total‖
    w_total_sq = sum_x_sq - (sum_x ** 2) / n
    w_total_norm = sqrt(max(0, w_total_sq))  # clamp for numerical safety
    
    # ‖w_int‖
    w_int_norm = w_total_norm - s_bound
    
    # Torus invariant: r_int² = (α_int - r_int·√n)² + w_int_norm²
    lhs = r_int ** 2
    rhs = (alpha_int - r_int * sqrt_n) ** 2 + w_int_norm ** 2
    
    return lhs - rhs  # should be ≈ 0
```

---

## 14. Computing Trades Within Tick Boundaries

### 14.1 Problem Statement

A user provides d units of token i and wants to receive as much of token j as possible.

Starting from reserves x, update xᵢ → xᵢ + d, then solve for the new xⱼ that satisfies the torus invariant.

### 14.2 The Equation to Solve

After adding d of token i, define:
    x'ₘ = xₘ for m ≠ i, j
    x'ᵢ = xᵢ + d
    x'ⱼ = xⱼ - Δ    (Δ is what we're solving for; the amount of token j the user receives)

We need:
    new_sum = sum_x + d - Δ
    new_sum_sq = sum_x_sq + (xᵢ + d)² - xᵢ² + (xⱼ - Δ)² - xⱼ²

Plugging into the torus invariant:

    r_int² = ((new_sum/√n) - k_bound - r_int·√n)² + (√(new_sum_sq - new_sum²/n) - s_bound)²

This is a quartic equation in Δ.

### 14.3 Solving the Quartic

**Off-chain (TypeScript SDK):** Use Newton's method with a good initial guess.

Initial guess: use the instantaneous price to estimate Δ₀:

    Δ₀ = d · (r - xᵢ) / (r - xⱼ)    (from the pricing formula)

Then iterate Newton's method:

```
function solve_trade(d, token_i, token_j, reserves, n, r_int, s_bound, k_bound):
    # Initial guess from instantaneous price
    r_eff = r_int  # use consolidated interior radius for pricing
    delta = d * (r_eff - reserves[token_i]) / (r_eff - reserves[token_j])
    delta = min(delta, reserves[token_j])  # can't take more than available
    
    for iteration in range(50):  # Newton's method
        # Compute invariant residual at current delta
        new_reserves = reserves.copy()
        new_reserves[token_i] += d
        new_reserves[token_j] -= delta
        
        f = compute_torus_invariant(
            sum(new_reserves),
            sum(x**2 for x in new_reserves),
            n, r_int, s_bound, k_bound
        )
        
        # Compute derivative df/d(delta) numerically
        eps = 1e-10
        new_reserves_eps = new_reserves.copy()
        new_reserves_eps[token_j] -= eps
        f_eps = compute_torus_invariant(
            sum(new_reserves_eps),
            sum(x**2 for x in new_reserves_eps),
            n, r_int, s_bound, k_bound
        )
        df = (f_eps - f) / (-eps)  # negative because delta reduces x_j
        
        if abs(df) < 1e-20:
            break
        
        delta -= f / df
        delta = max(0, min(delta, reserves[token_j]))
        
        if abs(f) < 1e-15:
            break
    
    return delta
```

### 14.4 On-Chain Verification (Algorand)

The on-chain contract does NOT solve the quartic. It only verifies:

```
function verify_trade(d, delta, token_i, token_j, reserves, n, r_int, s_bound, k_bound):
    new_reserves = reserves.copy()
    new_reserves[token_i] += d
    new_reserves[token_j] -= delta
    
    # Check 1: invariant holds
    residual = compute_torus_invariant(
        sum(new_reserves),
        sum(x**2 for x in new_reserves),
        n, r_int, s_bound, k_bound
    )
    assert abs(residual) < TOLERANCE
    
    # Check 2: no reserve went negative
    assert new_reserves[token_j] >= 0
    
    # Check 3: output is not more than the maximum possible
    # (prevents the SDK from giving MORE than the AMM should)
    # The new x_j should be >= r - sqrt(something) based on the sphere constraint
    # Simplest check: verify new_x_j <= old_x_j (user took tokens, didn't add)
    assert new_reserves[token_j] <= reserves[token_j]
    
    # Check 4: the new state is still within tick boundaries
    new_sum = sum(new_reserves)
    new_alpha = new_sum / sqrt(n)
    # For interior ticks, alpha should be <= k for the smallest interior tick
    # For boundary ticks, alpha should satisfy their constraints
    
    return True
```

**Opcode cost estimate for verification on Algorand AVM:**
- Computing new_sum: n additions ≈ n opcodes
- Computing new_sum_sq: n multiplications + n additions ≈ 3n opcodes
- Computing the torus invariant: ~20 opcodes (2 subtractions, 2 squares, 1 sqrt, 1 addition, 1 comparison)
- Total: ~5n + 30 opcodes

For n=5: ~55 opcodes. For n=100: ~530 opcodes. Well within budget.

---

## 15. Crossing Ticks

### 15.1 When Ticks Cross

During a trade, the system's state might move enough that:
- An interior tick's reserves reach its boundary (it becomes a boundary tick)
- A boundary tick's reserves move back inside (it becomes an interior tick)

When this happens, the consolidation parameters (r_int, s_bound, k_bound) change, and the torus invariant equation changes.

### 15.2 Detecting Crossings via Normalized Projection

To compare ticks of different sizes, normalize by dividing by the tick radius:

    α_norm = (x · v) / r = α / r

For an interior tick with parameters (r, k):
    k_norm = k / r

A tick is interior if and only if: k_norm > α_int_norm

where α_int_norm is the common normalized projection of all interior ticks.

### 15.3 The Next Tick to Cross

At any time, track:
- k_int_min: the smallest k_norm of all currently interior ticks (closest to crossing to boundary)
- k_bound_max: the largest k_norm of all currently boundary ticks (closest to crossing to interior)

A trade causes a crossing when the new α_int_norm either:
- Exceeds k_int_min (an interior tick becomes boundary), or
- Falls below k_bound_max (a boundary tick becomes interior)

### 15.4 Trade Segmentation

The off-chain SDK handles this:

1. Assume no ticks cross. Compute the full trade using the current torus invariant.
2. Check if any tick crossed (compare new α_int_norm with k_int_min and k_bound_max).
3. If no crossing: done.
4. If crossing detected:
   a. Find the exact amount of input that takes us to the crossing point.
   b. Execute the partial trade up to that point.
   c. Update the tick's state (interior ↔ boundary).
   d. Recompute consolidation parameters.
   e. Repeat with the remaining input.

### 15.5 Finding the Crossing Point

At the crossing point, α_int = r_int · k_cross_norm (where r_int is the current consolidated interior radius).

The crossing happens when:
    α_crossover = r_int · k_cross_norm + k_bound

The trade changes xᵢ by +d_cross and xⱼ by -d_cross_j.

    new_sum = sum_x + d_cross - d_cross_j
    new_alpha = new_sum / √n = α_crossover

Since d_cross_j = α_total + (d_cross - d_cross_j)/√n ... this results in:

    d_cross_j = √n · (α_total - α_crossover) + d_cross

Substituting into the torus invariant at the crossover point gives a QUADRATIC equation in d_cross (simpler than the quartic for the full trade). Solve with the quadratic formula.

### 15.6 Implementation (Off-Chain SDK)

```
function execute_trade_with_crossings(d, token_i, token_j, reserves, ticks, n):
    remaining_input = d
    total_output = 0
    current_reserves = reserves.copy()
    
    while remaining_input > 0:
        # Consolidate current ticks
        r_int, s_bound, k_bound = consolidate_ticks(ticks, n)
        
        # Try full trade
        delta = solve_trade(remaining_input, token_i, token_j,
                           current_reserves, n, r_int, s_bound, k_bound)
        
        # Check for tick crossings
        new_reserves = current_reserves.copy()
        new_reserves[token_i] += remaining_input
        new_reserves[token_j] -= delta
        
        new_alpha_int_norm = compute_alpha_int_norm(new_reserves, ticks, n)
        crossing_tick, crossing_type = find_crossing(new_alpha_int_norm, ticks)
        
        if crossing_tick is None:
            # No crossing, trade is complete
            total_output += delta
            current_reserves = new_reserves
            break
        
        # Find partial trade up to crossing point
        d_partial = solve_crossing_point(remaining_input, token_i, token_j,
                                         current_reserves, n, r_int, s_bound, k_bound,
                                         crossing_tick)
        
        delta_partial = solve_trade(d_partial, token_i, token_j,
                                     current_reserves, n, r_int, s_bound, k_bound)
        
        # Execute partial trade
        current_reserves[token_i] += d_partial
        current_reserves[token_j] -= delta_partial
        total_output += delta_partial
        remaining_input -= d_partial
        
        # Update tick state
        if crossing_type == "interior_to_boundary":
            crossing_tick.state = BOUNDARY
        else:
            crossing_tick.state = INTERIOR
    
    return total_output, current_reserves
```

### 15.7 On-Chain Verification of Tick Crossings

The SDK submits a "trade recipe" to the contract:

```
struct TradeRecipe:
    segments: list of TradeSegment
    
struct TradeSegment:
    amount_in: uint64
    amount_out: uint64
    tick_crossed_id: optional<uint64>  # which tick changed state
    new_tick_state: optional<enum>      # INTERIOR or BOUNDARY
```

The on-chain contract verifies each segment:
1. For each segment, verify the torus invariant holds after applying that segment's input/output.
2. If a tick crossing is claimed, verify that α_int_norm equals k_norm for that tick.
3. After the crossing, update the tick state and re-consolidate.
4. Continue to the next segment.

---

## 16. Algorand Architecture

### 16.1 The Core Pattern: Compute Off-Chain, Verify On-Chain

The AVM's opcode budget is tight (700 per app call, poolable up to ~190K). The full Newton solver for the quartic is too expensive to run on-chain. Instead:

- **Off-chain SDK** (TypeScript): Computes the optimal trade, detects tick crossings, segments the trade, builds the atomic group.
- **On-chain contract** (Algorand Python): Verifies the invariant holds, checks tick boundaries, executes ASA transfers.

Verification is dramatically cheaper than computation:
- Computing a trade: ~5,000-20,000 opcodes (Newton iterations, quartic solving)
- Verifying a trade: ~50-500 opcodes (plug in values, check equality)

### 16.2 Opcode Budget Management

A single app call gives 700 budget. To get more:
- Group the real app call with "dummy" app calls (NoOp transactions to the same contract that immediately approve)
- Budget pools across the group
- 4 dummy calls + 1 real call = 3,500 budget
- 8 dummy calls + 1 real call = 6,300 budget

The SDK automatically adds the right number of dummy calls based on the trade's complexity (number of tick crossings × verification cost per segment).

### 16.3 Storage Layout

**Global State (14 uint64 slots available):**
- n (number of tokens)
- sum_x (Σxᵢ, sum of reserves)
- sum_x_sq (Σxᵢ², sum of squared reserves)
- r_int (consolidated interior radius)
- s_bound (consolidated boundary radius)
- k_bound (consolidated boundary plane constant)
- num_ticks (number of active ticks)
- paused (admin flag)

**Box Storage:**
- `reserves` box: array of n uint64 values, the full reserve vector [x₁, x₂, ..., xₙ]
- `tick:{id}` box: per-tick parameters (r, k, state, liquidity, lp_address)
- `lp:{addr}:{tick_id}` box: LP position data
- `token:{idx}` box: ASA ID for the idx-th token in the pool

**Local State:** Not used (LPs interact via boxes, not opt-in).

### 16.4 Token Handling

Stablecoins on Algorand are ASAs (Algorand Standard Assets). The pool contract holds reserves of each ASA. Transfers happen via inner transactions:

- User → Pool: user sends ASA transfer in the atomic group, contract verifies receipt
- Pool → User: contract issues inner AssetTransfer transaction

### 16.5 Transaction Flow for a Swap

The SDK constructs an atomic group:

```
Transaction Group:
  [0] Payment: user pays 0.002 ALGO for fees
  [1] ASA Transfer: user sends d of token_i to pool contract
  [2] App Call (NoOp): dummy budget txn #1 → approve immediately
  [3] App Call (NoOp): dummy budget txn #2 → approve immediately  
  [4] App Call (swap): 
        args: [token_i, token_j, d, claimed_delta, min_delta, trade_recipe_bytes]
        boxes: [reserves, tick:0, tick:1, ...]
        foreign_assets: [ASA_id_of_token_j]
        → verifies trade, updates reserves, sends token_j to user via inner txn
```

---

## 17. Smart Contract Implementation

### 17.1 Contract Structure (Algorand Python)

```python
# orbital_pool.py
from algopy import (
    ARC4Contract, GlobalState, BoxRef, BoxMap,
    UInt64, Bytes, Account, Asset, Txn, Global,
    itxn, subroutine, op, arc4
)
import algopy

PRECISION = UInt64(1_000_000_000)  # 10^9 for fixed-point

class OrbitalPool(ARC4Contract):
    
    # ---- Global State ----
    n: GlobalState[UInt64]                  # number of tokens
    sum_x: GlobalState[UInt64]              # Σ reserves
    sum_x_sq: GlobalState[UInt64]           # Σ reserves²
    r_int: GlobalState[UInt64]              # consolidated interior radius
    s_bound: GlobalState[UInt64]            # consolidated boundary radius
    k_bound: GlobalState[UInt64]            # consolidated boundary k
    num_ticks: GlobalState[UInt64]          # active tick count
    
    # ---- Box Storage ----
    # reserves: Box containing n uint64 values
    # ticks: BoxMap of tick_id -> tick_data
    # tokens: BoxMap of index -> ASA ID
    
    @arc4.abimethod(create="require")
    def create(self, n: UInt64, token_ids: arc4.DynamicArray[arc4.UInt64]) -> None:
        """Initialize pool with n tokens."""
        self.n = n
        self.sum_x = UInt64(0)
        self.sum_x_sq = UInt64(0)
        self.r_int = UInt64(0)
        self.s_bound = UInt64(0)
        self.k_bound = UInt64(0)
        self.num_ticks = UInt64(0)
        
        # Store token ASA IDs
        # Opt the contract into each ASA via inner txns
        # Initialize reserves box with zeros
    
    @arc4.abimethod
    def add_tick(self, r: UInt64, k: UInt64) -> None:
        """LP creates a new tick with given parameters."""
        # Validate k is in [k_min, k_max]
        # Compute virtual reserves
        # Accept LP deposit (actual reserves = q - x_min per token)
        # Store tick in box
        # Update consolidation: add r to r_int (new ticks start interior)
        pass
    
    @arc4.abimethod
    def swap(
        self,
        token_in_idx: UInt64,
        token_out_idx: UInt64,
        amount_in: UInt64,
        claimed_amount_out: UInt64,
        min_amount_out: UInt64,
    ) -> None:
        """Execute a swap. The claimed_amount_out is computed off-chain."""
        
        # Step 1: Verify the user actually sent amount_in of the correct ASA
        # (check the preceding ASA transfer in the group)
        
        # Step 2: Compute new reserves
        # new_x_i = old_x_i + amount_in
        # new_x_j = old_x_j - claimed_amount_out
        
        # Step 3: Compute new sum_x and sum_x_sq
        # new_sum = sum_x + amount_in - claimed_amount_out
        # new_sum_sq = sum_x_sq + new_x_i² - old_x_i² + new_x_j² - old_x_j²
        
        # Step 4: Verify torus invariant
        # (alpha_int - r_int*sqrt_n)² + (w_norm - s_bound)² == r_int²
        
        # Step 5: Verify slippage
        # claimed_amount_out >= min_amount_out
        
        # Step 6: Update stored reserves, sum_x, sum_x_sq
        
        # Step 7: Send token_out to user via inner transaction
        pass
    
    @arc4.abimethod
    def swap_with_crossings(
        self,
        token_in_idx: UInt64,
        token_out_idx: UInt64,
        total_amount_in: UInt64,
        trade_recipe: arc4.DynamicBytes,
        min_amount_out: UInt64,
    ) -> None:
        """Execute a swap that crosses tick boundaries.
        trade_recipe contains the segmented trade computed off-chain."""
        
        # Decode trade_recipe into segments
        # For each segment:
        #   1. Verify invariant holds for this segment
        #   2. If tick crossing claimed, verify α_int_norm == k_norm for that tick
        #   3. Update tick state
        #   4. Re-consolidate
        #   5. Update reserves
        # After all segments:
        #   Verify total output >= min_amount_out
        #   Send total output to user
        pass
    
    @arc4.abimethod
    def remove_liquidity(self, tick_id: UInt64, shares: UInt64) -> None:
        """LP removes liquidity from a tick."""
        # Compute LP's share of the tick's current reserves
        # Update tick parameters
        # Send tokens back to LP
        pass
```

### 17.2 The Verification Subroutine (Detailed)

```python
@subroutine
def verify_invariant(
    sum_x: UInt64,
    sum_x_sq: UInt64,
    n: UInt64,
    r_int: UInt64,
    s_bound: UInt64,
    k_bound: UInt64,
) -> bool:
    """
    Verify the torus invariant holds.
    All values are scaled by PRECISION.
    
    The invariant: r_int² = (α_int - r_int·√n)² + (‖w‖ - s_bound)²
    
    Where:
      α_int = sum_x/√n - k_bound
      ‖w‖ = √(sum_x_sq - sum_x²/n)
    """
    
    # Compute α_total = sum_x / √n
    # Since √n is irrational, precompute inv_sqrt_n scaled
    # For n=5: √5 ≈ 2.236, inv_sqrt_n ≈ 0.4472
    # Store as: INV_SQRT_N = 447_213_595  (scaled by PRECISION=10^9)
    
    # α_total (scaled by PRECISION²) = sum_x * INV_SQRT_N
    # But this overflows uint64 for large pools, so use wide math:
    alpha_total = op.mulw(sum_x, INV_SQRT_N)  # 128-bit result
    # ... need to handle precision carefully
    
    # α_int = α_total - k_bound
    alpha_int = alpha_total - k_bound  # (appropriately scaled)
    
    # (α_int - r_int·√n)
    # r_int · √n = r_int * SQRT_N / PRECISION
    r_int_sqrt_n = op.mulw(r_int, SQRT_N)  # 128-bit intermediate
    diff_alpha = alpha_int - r_int_sqrt_n  # appropriately scaled
    
    # diff_alpha²
    term1 = diff_alpha * diff_alpha
    
    # ‖w_total‖² = sum_x_sq - sum_x²/n
    sum_x_sq_div_n = op.mulw(sum_x, sum_x)  # sum_x²
    # divide by n
    w_total_sq = sum_x_sq - sum_x_sq_div_n / n
    
    # ‖w_total‖ = sqrt(w_total_sq)
    w_total_norm = op.sqrt(w_total_sq)
    
    # ‖w_int‖ = ‖w_total‖ - s_bound
    w_int_norm = w_total_norm - s_bound
    
    # w_int_norm²
    term2 = w_int_norm * w_int_norm
    
    # RHS = term1 + term2
    rhs = term1 + term2
    
    # LHS = r_int²
    lhs = r_int * r_int
    
    # Check equality within tolerance
    # Allow TOLERANCE = 1000 (in PRECISION² units, ≈ 10^-15 in real units)
    if lhs > rhs:
        return (lhs - rhs) <= TOLERANCE
    else:
        return (rhs - lhs) <= TOLERANCE
```

### 17.3 Handling √n On-Chain

Since n is fixed at pool creation, precompute √n and 1/√n at deployment time and store them as global state:

```python
@arc4.abimethod(create="require")
def create(self, n: UInt64, sqrt_n_scaled: UInt64, inv_sqrt_n_scaled: UInt64, ...):
    """
    sqrt_n_scaled = floor(√n × PRECISION)
    inv_sqrt_n_scaled = floor((1/√n) × PRECISION)
    
    These are provided by the deployer and verified on-chain:
    """
    # Verify: sqrt_n² ≈ n * PRECISION²
    check = sqrt_n_scaled * sqrt_n_scaled
    expected = n * PRECISION * PRECISION
    assert abs(check - expected) < PRECISION  # within 1 unit of error
    
    self.sqrt_n = sqrt_n_scaled
    self.inv_sqrt_n = inv_sqrt_n_scaled
```

### 17.4 Inner Transactions for Token Transfers

```python
@subroutine
def send_tokens(asset_id: UInt64, receiver: Account, amount: UInt64) -> None:
    itxn.AssetTransfer(
        xfer_asset=asset_id,
        asset_receiver=receiver,
        asset_amount=amount,
        fee=0,  # fee pooling
    ).submit()
```

---

## 18. Off-Chain SDK Implementation

### 18.1 SDK Structure (TypeScript)

```
orbital-sdk/
├── src/
│   ├── math/
│   │   ├── sphere.ts          # Sphere AMM math
│   │   ├── torus.ts           # Torus invariant
│   │   ├── newton.ts          # Newton's method solver
│   │   ├── ticks.ts           # Tick management
│   │   ├── consolidation.ts   # Tick consolidation
│   │   └── fixedpoint.ts      # Fixed-point arithmetic
│   ├── pool/
│   │   ├── OrbitalPool.ts     # Main pool class
│   │   ├── swap.ts            # Swap computation + routing
│   │   └── liquidity.ts       # LP operations
│   ├── algorand/
│   │   ├── client.ts          # Algorand client wrapper
│   │   ├── transactions.ts    # Atomic group builder
│   │   └── budget.ts          # Budget pooling logic
│   └── index.ts
├── tests/
│   ├── math.test.ts
│   ├── swap.test.ts
│   └── integration.test.ts
└── package.json
```

### 18.2 Core Math Module

```typescript
// src/math/sphere.ts

export function sphereInvariant(
    reserves: bigint[],
    r: bigint,
    precision: bigint
): bigint {
    // Returns Σ(r - xᵢ)² - r²
    // Should be 0 for valid state
    let sum = 0n;
    for (const x of reserves) {
        const diff = r - x;
        sum += (diff * diff) / precision;
    }
    return sum - (r * r) / precision;
}

export function torusInvariant(
    sumX: bigint,
    sumXSq: bigint,
    n: bigint,
    rInt: bigint,
    sBound: bigint,
    kBound: bigint,
    sqrtN: bigint,
    precision: bigint
): bigint {
    // α_total = sumX / √n
    const alphaTotal = (sumX * precision) / sqrtN;
    
    // α_int = α_total - k_bound
    const alphaInt = alphaTotal - kBound;
    
    // term1 = (α_int - r_int·√n)²
    const rIntSqrtN = (rInt * sqrtN) / precision;
    const diff1 = alphaInt - rIntSqrtN;
    const term1 = (diff1 * diff1) / precision;
    
    // ‖w_total‖² = sumXSq - sumX²/n
    const wTotalSq = sumXSq - (sumX * sumX) / n;
    
    // ‖w_total‖ = sqrt(wTotalSq)
    const wTotalNorm = sqrt(wTotalSq);
    
    // ‖w_int‖ = ‖w_total‖ - s_bound
    const wIntNorm = wTotalNorm - sBound;
    
    // term2 = ‖w_int‖²
    const term2 = (wIntNorm * wIntNorm) / precision;
    
    // invariant: r_int² = term1 + term2
    const lhs = (rInt * rInt) / precision;
    const rhs = term1 + term2;
    
    return lhs - rhs;
}
```

### 18.3 Newton Solver

```typescript
// src/math/newton.ts

export function solveSwap(
    amountIn: bigint,
    tokenIn: number,
    tokenOut: number,
    reserves: bigint[],
    n: number,
    rInt: bigint,
    sBound: bigint,
    kBound: bigint,
    sqrtN: bigint,
    precision: bigint,
    maxIterations: number = 50,
    tolerance: bigint = 1n
): bigint {
    // Initial guess from instantaneous price
    const r = rInt; // simplified; use actual center
    let delta = (amountIn * (r - reserves[tokenIn])) / (r - reserves[tokenOut]);
    if (delta > reserves[tokenOut]) {
        delta = reserves[tokenOut] - 1n;
    }
    
    for (let i = 0; i < maxIterations; i++) {
        // Compute f(delta)
        const newReserves = [...reserves];
        newReserves[tokenIn] += amountIn;
        newReserves[tokenOut] -= delta;
        
        const sumX = newReserves.reduce((a, b) => a + b, 0n);
        const sumXSq = newReserves.reduce((a, b) => a + b * b / precision, 0n);
        
        const f = torusInvariant(sumX, sumXSq, BigInt(n), rInt, sBound, kBound, sqrtN, precision);
        
        if (abs(f) <= tolerance) break;
        
        // Numerical derivative: f(delta + eps) - f(delta) / eps
        const eps = precision / 1000000n; // small perturbation
        const newReservesEps = [...newReserves];
        newReservesEps[tokenOut] -= eps;
        const sumXEps = newReservesEps.reduce((a, b) => a + b, 0n);
        const sumXSqEps = newReservesEps.reduce((a, b) => a + b * b / precision, 0n);
        const fEps = torusInvariant(sumXEps, sumXSqEps, BigInt(n), rInt, sBound, kBound, sqrtN, precision);
        
        const df = (fEps - f) * precision / (-eps); // negative because delta reduces x_j
        
        if (df === 0n) break;
        
        delta = delta - (f * precision) / df;
        if (delta < 0n) delta = 0n;
        if (delta > reserves[tokenOut]) delta = reserves[tokenOut] - 1n;
    }
    
    return delta;
}
```

### 18.4 Atomic Group Builder

```typescript
// src/algorand/transactions.ts

export async function buildSwapGroup(
    client: AlgodClient,
    poolAppId: number,
    sender: string,
    tokenInAsaId: number,
    tokenOutAsaId: number,
    amountIn: bigint,
    computedAmountOut: bigint,
    minAmountOut: bigint,
    numBudgetTxns: number = 4,
): Promise<TransactionGroup> {
    const suggestedParams = await client.getTransactionParams().do();
    
    const txns = [];
    
    // 1. ASA transfer: user sends tokens to pool
    txns.push(makeAssetTransferTxnWithSuggestedParams(
        sender,
        getApplicationAddress(poolAppId),
        undefined,
        undefined,
        Number(amountIn),
        undefined,
        tokenInAsaId,
        suggestedParams,
    ));
    
    // 2. Budget-pooling dummy app calls
    for (let i = 0; i < numBudgetTxns; i++) {
        txns.push(makeApplicationNoOpTxn(
            sender,
            suggestedParams,
            poolAppId,
            [new Uint8Array([0])],  // "budget" method selector
        ));
    }
    
    // 3. The real swap app call
    txns.push(makeApplicationNoOpTxn(
        sender,
        suggestedParams,
        poolAppId,
        [
            new Uint8Array([/* "swap" method selector */]),
            encodeUint64(tokenInIdx),
            encodeUint64(tokenOutIdx),
            encodeUint64(amountIn),
            encodeUint64(computedAmountOut),
            encodeUint64(minAmountOut),
        ],
        undefined,  // accounts
        undefined,  // foreign apps
        [tokenOutAsaId],  // foreign assets
        boxReferences,
    ));
    
    // Assign group ID
    assignGroupID(txns);
    
    return txns;
}
```

---

## 19. Frontend Implementation

### 19.1 Core Features

The frontend needs:

1. **Swap Interface**: Select token in/out, enter amount, see estimated output and price impact
2. **LP Dashboard**: Create ticks, add/remove liquidity, see positions and earned fees
3. **Pool Analytics**: Capital efficiency display, current prices, reserve levels
4. **3D Visualization** (optional but impressive): Render the sphere and ticks using Three.js

### 19.2 Swap Interface Logic

```typescript
// React component pseudocode

async function handleSwap(tokenIn, tokenOut, amountIn) {
    // 1. Fetch current pool state from Algorand
    const poolState = await fetchPoolState(poolAppId);
    
    // 2. Compute optimal output off-chain
    const amountOut = solveSwap(
        amountIn, tokenIn, tokenOut,
        poolState.reserves, poolState.n,
        poolState.rInt, poolState.sBound, poolState.kBound,
        poolState.sqrtN, PRECISION
    );
    
    // 3. Apply slippage tolerance (e.g., 0.5%)
    const minAmountOut = amountOut * 995n / 1000n;
    
    // 4. Build and sign transaction group
    const txnGroup = await buildSwapGroup(
        client, poolAppId, userAddress,
        tokenInAsaId, tokenOutAsaId,
        amountIn, amountOut, minAmountOut
    );
    
    // 5. Sign and submit
    const signedTxns = await peraWallet.signTransactions(txnGroup);
    await client.sendRawTransaction(signedTxns).do();
}
```

### 19.3 Capital Efficiency Display

This is the key selling point. Show users:

```
Pool: USDC / USDT / DAI / FRAX / LUSD
Tick: $0.99 depeg boundary
Capital efficiency: 150x vs Curve
Your deposit: $1,000
Effective liquidity: $150,000
```

Compute on-the-fly from the pool parameters using the formula from Section 11.

### 19.4 Three.js Sphere Visualization (3-Token Projection)

For pools with more than 3 tokens, project the n-dimensional state onto 3 chosen tokens for visualization. Show:
- The sphere surface (wireframe, semi-transparent)
- The current reserve point (bright dot on the surface)
- Tick boundaries (circles on the sphere)
- Animate trades as the dot slides along the surface

---

## 20. Testing Strategy

### 20.1 Unit Tests (Math)

Write comprehensive tests for all math functions. Critical test cases:

**Sphere invariant:**
- Equal price point satisfies invariant
- Maximum single-token reserves (0, r, r, ..., r) satisfies invariant
- Random valid reserves satisfy invariant
- Slightly perturbed reserves do NOT satisfy invariant

**Pricing:**
- At equal price point, all prices are 1.0
- If one reserve is low, its price is high
- Price symmetry: price(i,j) × price(j,i) = 1

**Tick boundaries:**
- k_min corresponds to the equal price point
- k_max corresponds to single-token-at-zero state
- x_min and x_max are within valid ranges

**Capital efficiency:**
- Verify against known values (e.g., n=5, p=0.99 → ~150x)

**Newton solver:**
- Small trades: output ≈ input × instantaneous price
- Large trades: output < input × instantaneous price (price impact)
- Zero input → zero output
- Maximum input → output approaches reserve limit

### 20.2 Integration Tests

**Swap round-trip:**
1. Swap A→B, then swap B→A with the output
2. Verify you get back approximately what you started with (minus price impact)

**Tick crossing:**
1. Create two ticks with different k values
2. Execute a trade large enough to cross the boundary
3. Verify the trade recipe is correct and the final state is valid

**LP operations:**
1. Add liquidity to a tick
2. Execute several swaps
3. Remove liquidity
4. Verify LP received back their capital plus fees

### 20.3 Algorand-Specific Tests

Use AlgoKit's localnet:

```bash
algokit localnet start
algokit project run test
```

Test:
- Contract deployment with n tokens
- ASA opt-in
- Swap execution (single tick, no crossing)
- Swap execution (multi-tick, with crossing)
- Budget pooling (verify swaps succeed with enough dummy txns, fail without)
- Box storage reads/writes
- Edge cases: zero reserves, maximum reserves, slippage failures

---

## 21. Deployment Guide

### 21.1 Testnet Deployment

```bash
# 1. Set up AlgoKit
algokit init -t python  # or use existing project

# 2. Configure for testnet
# Update .env with testnet algod URL and deployer mnemonic

# 3. Create mock stablecoin ASAs
# Deploy 5 ERC20-like ASAs: mockUSDC, mockUSDT, mockDAI, mockFRAX, mockLUSD
algokit project deploy -- --network testnet

# 4. Deploy OrbitalPool contract
# Pass: n=5, token ASA IDs, sqrt_5_scaled, inv_sqrt_5_scaled

# 5. Fund the contract with ALGO for inner transaction fees

# 6. Opt the contract into all 5 ASAs

# 7. Create initial tick (LP deposits liquidity)

# 8. Test a swap
```

### 21.2 Precomputed Constants for Common n Values

| n | √n (exact) | √n × 10⁹ (scaled) | (1/√n) × 10⁹ (scaled) |
|---|-----------|-------------------|----------------------|
| 2 | 1.41421... | 1_414_213_562 | 707_106_781 |
| 3 | 1.73205... | 1_732_050_808 | 577_350_269 |
| 4 | 2.0       | 2_000_000_000 | 500_000_000 |
| 5 | 2.23606... | 2_236_067_977 | 447_213_595 |
| 10| 3.16227...| 3_162_277_660 | 316_227_766 |

---

## 22. Quick Reference: All Formulas

### Core Invariant (Sphere)
    Σᵢ₌₁ⁿ (r - xᵢ)² = r²

### Instantaneous Price (Xⱼ per Xᵢ)
    price = (r - xᵢ) / (r - xⱼ)

### Equal Price Point
    q = r(1 - 1/√n)    for each token

### Unit Direction Vector
    v = (1/√n, 1/√n, ..., 1/√n)

### Polar Decomposition
    x = α·v + w    where α = x·v = Σxᵢ/√n,  w ⊥ v
    ‖w‖² = Σxᵢ² - (Σxᵢ)²/n

### Orthogonal Subspace Radius
    s = √(r² - (α - r√n)²)

### Tick Boundary
    x · v = k    ⟹    Σxᵢ/√n = k

### Tick Size Bounds
    k_min = r(√n - 1)
    k_max = r(n-1)/√n

### Minimum Reserve per Token in a Tick
    c = n·r - k·√n
    x_min = r - (c + √((n-1)·(n·r² - c²))) / n

### Virtual Reserves
    virtual_per_token = x_min(k)

### Capital Efficiency
    efficiency = q / (q - x_min(k))    where q = r(1 - 1/√n)

### Tick Consolidation (Interior)
    r_int = Σ rᵢ    for all interior ticks

### Tick Consolidation (Boundary)
    s_bound = Σ √(rᵢ² - (kᵢ - rᵢ√n)²)    for all boundary ticks
    k_bound = Σ kᵢ    for all boundary ticks

### The Torus Invariant (Global Trade Equation)
    r_int² = (α_int - r_int·√n)² + (‖w_total‖ - s_bound)²

    where:
        α_int = Σx_total / √n - k_bound
        ‖w_total‖ = √(Σx²_total - (Σx_total)²/n)

### Constant-Time Trade Computation
Only track:  Σxᵢ  and  Σxᵢ²
Update per swap (tokens i and j):
    new_sum = old_sum + d_i - d_j
    new_sum_sq = old_sum_sq + (x_i+d_i)² - x_i² + (x_j-d_j)² - x_j²

### Tick Crossing Detection
    Tick is interior ⟺ k/r > α_int_norm
    α_int_norm = common normalized projection of all interior ticks

### Crossing Point (Quadratic in d_cross)
    d_j_cross = √n · (α_total - α_crossover) + d_i_cross
    Plug into torus invariant → solve quadratic for d_i_cross

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| AMM | Automated Market Maker — a smart contract that holds reserves of multiple tokens and algorithmically sets prices |
| ASA | Algorand Standard Asset — the native token standard on Algorand |
| AVM | Algorand Virtual Machine — executes smart contract bytecode |
| Concentrated Liquidity | Restricting an LP's capital to a specific price range for higher efficiency |
| Depeg | When a stablecoin's market price deviates from its target (e.g., $1) |
| Interior Tick | A tick whose current reserves are not pinned to its boundary |
| Boundary Tick | A tick whose reserves have been pushed to its boundary by price divergence |
| LP | Liquidity Provider — deposits tokens into the AMM |
| Polar Decomposition | Breaking reserves into parallel-to-v and orthogonal-to-v components |
| Spherical Cap | The region of a sphere's surface cut off by a plane — this is what Orbital ticks are |
| Tick | A liquidity position with a specific price range (defined by k) and size (defined by r) |
| Torus | The donut-shaped surface formed by combining the interior and boundary consolidated ticks |
| Virtual Reserves | The minimum possible reserves that serve as a "floor" — LPs don't need to deposit these |

---

## Appendix B: Common Pitfalls

1. **Precision loss in (α - r√n)²**: When α is close to r√n (normal trading), this subtraction loses precision. Factor as (α - r√n) = (Σxᵢ/√n - r√n) = (Σxᵢ - nr)/√n and compute (Σxᵢ - nr) first.

2. **Overflow in sum_x_sq**: For n=10 tokens with reserves ~10⁹ each, sum_x_sq ~10¹⁹, which fits in uint64 (max ~1.8×10¹⁹). For larger pools or higher precision, use Algorand's byte-math (bsqrt, b+, b*, b-) with up to 512-bit integers.

3. **Newton solver non-convergence**: Always clamp delta to [0, reserves[tokenOut]] after each iteration. Use the instantaneous price as the initial guess. If Newton doesn't converge in 50 iterations, something is wrong with the state.

4. **Tick crossing edge case**: A trade might cross multiple ticks. The off-chain SDK must handle this iteratively, not just check for one crossing. In practice, most normal stablecoin trades won't cross any ticks.

5. **Rounding direction**: On-chain, always round against the user (less output for swaps, more deposit for LP adds). This prevents tiny exploits through rounding.

6. **Box storage on Algorand**: Each box reference in a transaction gives 1KB of read budget. For large pools, you need multiple box references. Plan your box layout to minimize references per transaction.

7. **ASA opt-in**: The pool contract must opt into every ASA in the pool. This costs 0.1 ALGO per ASA in minimum balance. Fund the contract accordingly.

---

*This manual was prepared based on the Orbital paper by Dave White, Dan Robinson, and Ciamac Moallemi (Paradigm, June 2025). The Algorand-specific architecture and implementation details are original engineering work.*
