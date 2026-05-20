# Taurus Protocol — Go-To-Market Plan

**Multi-asset concentrated liquidity, finally solved.**
A Paradigm-research-grade AMM, shipped on Algorand.

> *Prepared as an investor-facing strategy document.*
> *Author: Taurus Protocol founding team.*
> *Date: May 2026.*
> *Status: Testnet live · Mainnet target Q3 2026 · SDK public on npm.*

---

## 0. Executive Summary

**The thesis in one sentence.** Stablecoins are the largest, fastest-growing, and most strategically important asset class in crypto — yet the AMMs that route their liquidity are fifteen-year-old designs that force every LP and every router into a painful tradeoff: *multi-asset pools or concentrated capital, never both.* Taurus Protocol is the first AMM to deliver both, with constant-time on-chain verification, on the only L1 whose performance profile makes it economically viable.

**The product.** TaurusSwap is a multi-asset concentrated-liquidity AMM. A single pool holds 2–10,000 tokens. Liquidity providers choose their own depeg tolerance (a "tick" — a spherical cap in n-dimensional reserve space). The on-chain contract verifies trades against a **torus invariant** in `O(1)` opcodes, regardless of how many tokens or how many ticks the pool contains. The mathematics is from the Paradigm research paper *Orbital* (White, Robinson, Moallemi, June 2025). The implementation, the SDK, and the Algorand-native engineering are ours.

**The defensible moat.**

| | Uniswap V3 | Curve | **TaurusSwap** |
|---|---|---|---|
| Tokens per pool | 2 | n | **n** |
| Concentrated liquidity | Yes | No | **Yes** |
| On-chain verification | O(1) | O(n) | **O(1)** |
| Capital efficiency (n=5, $0.99 depeg) | N/A | 1× | **~150×** |
| Suitable chain | EVM (high cost) | EVM (high cost) | **Algorand (3.3s, sub-cent fees)** |

**The ask.** A seed round to fund 12 months of runway: mainnet launch, security audit, liquidity incentive program, three institutional integrations, and the founding revenue engine (protocol fee + B2B routing).

**Why now.** Three vectors are converging:
1. **Stablecoin supply has crossed ~$250B** and is growing faster than any prior crypto asset class — the addressable pool that benefits most from concentrated multi-asset liquidity.
2. **Paradigm published the math in June 2025** — first-mover advantage on an implementation window that closes within 12 months as EVM teams attempt expensive ports.
3. **Algorand's 2025 AVM upgrades** (boxes, larger opcode budgets, sub-second TPS upgrades) make this design economically possible for the first time on a public L1.

We are the only team that has shipped a working implementation, with public SDK, reference simulator, and deployed contracts on testnet.

---

## 1. The Problem: A 2×2 Nobody Has Solved

Every AMM in production today sits in one of three quadrants. The fourth quadrant — multi-asset pools *and* concentrated liquidity — has remained mathematically out of reach.

```
                Multi-asset (n tokens)
                       │
        Curve  ────────┼──────── TaurusSwap
                       │
   Uniform LP ─────────┼───────── Concentrated LP
                       │
       UniV2  ─────────┼───────── UniV3
                       │
                  Single pair (2 tokens)
```

**Curve** holds n stablecoins in one pool but forces every LP into the same uniform exposure curve. An LP who believes USDC/USDT/DAI never trade outside [$0.995, $1.005] cannot concentrate capital there. They must cover the full curve, earning fees on capital they would never deploy if given the choice.

**Uniswap V3** lets LPs concentrate by range — but only for two tokens. Five stablecoins require *ten* pools (C(5,2)=10). Liquidity fragments, routing becomes a graph-search problem, and slippage compounds across hops.

**The cost of this tradeoff.** Stablecoin LPs collectively idle hundreds of millions of dollars in capital that would never be deployed if concentration were possible. Routers waste basis points on multi-hop swaps that should be single-hop. Treasuries pay slippage that should not exist.

This is the largest unaddressed inefficiency in DeFi infrastructure.

---

## 2. The Solution: Sphere Geometry → Torus Invariant → O(1) Verification

The intuition (the full derivation is in `docs/02-mathematical-foundations.md`):

1. **Reserves live on an n-dimensional sphere.** The invariant `‖r⃗ - x‖² = r²` generalizes Curve's stableswap to any n.
2. **A "tick" is a spherical cap.** Each LP picks a depeg tolerance parameter `k`. Their position is the region of the sphere within distance `k` of the equal-price point.
3. **Consolidation.** All interior ticks (where reserves currently sit inside) collapse into one sphere. All boundary ticks collapse into another. Together they form a **torus**.
4. **The torus equation uses only `Σxᵢ` and `Σxᵢ²`** — two running sums that update in `O(1)` per trade.
5. **Compute off-chain, verify on-chain.** The SDK solves the quartic trade equation (Newton + bisection). The smart contract verifies the new state lies on the torus. *Solving is expensive; checking is cheap.* This asymmetry — the same one that makes zero-knowledge cryptography work — is what makes O(1) verification possible.

**The result.**

| Metric | TaurusSwap | Industry baseline |
|---|---|---|
| Capital efficiency at $0.99 depeg (n=5) | **~150×** vs Curve | 1× (Curve) |
| Capital efficiency at $0.95 depeg (n=5) | **~30×** vs Curve | 1× (Curve) |
| On-chain verification cost | **~55 opcodes** for n=5 | Linear in n (Curve), ~200+ opcodes |
| Verification cost at n=10,000 | **~55 opcodes** (unchanged) | Infeasible on any current L1 |
| Finality | **3.3 seconds** (Algorand) | 12s (Ethereum), 0.4s (Solana), variable |
| Fee per trade | **<$0.001** (Algorand) | $1–$50 (Ethereum L1), $0.05–$0.50 (L2s) |

Mathematically, this is the kind of result research firms publish and never ship. We shipped it.

---

## 3. Market Sizing: TAM / SAM / SOM

**Methodology.** We anchor TAM to on-chain stablecoin DEX volume and the broader fungible-asset basket market (LSTs, wrapped assets, RWA tokens, FX-stablecoins). All figures are directional and based on publicly observable on-chain data. Forward-looking projections are marked clearly.

### 3.1 Total Addressable Market (TAM)

**Stablecoin total supply (2026):** ~$250B and growing at ~40% YoY. Annual stablecoin DEX volume in 2025 was on the order of **$1.5–2.0 trillion**, with the majority routing through Curve, Uniswap, and aggregators.

If we capture **0.04% protocol fee** on stablecoin DEX volume — half of Curve's ~0.04% fee, set deliberately below incumbents — the theoretical annual fee pool is **$600M–$800M**.

Adjacent baskets — liquid staking tokens (~$50B), wrapped BTC/ETH variants, RWA-backed stablecoins (T-bills, gold, FX), and yield-bearing dollar tokens — expand TAM by an estimated **2–3×**.

**TAM (annual protocol fee pool, 2026): $1.5B–$2.5B**, growing in step with stablecoin issuance.

### 3.2 Serviceable Addressable Market (SAM)

We constrain SAM to:
- **Multi-asset baskets** where TaurusSwap's mathematics provides differentiated value (stablecoin baskets ≥3 tokens, LST baskets, FX-stablecoin baskets, RWA baskets).
- **Routes where capital efficiency matters more than liquidity depth** — small-to-mid size trades up to ~$5M where a 150× CE moat translates to measurably better execution.

SAM is approximately **40% of TAM ≈ $600M–$1.0B** in annual fees, addressable across multiple chains over a 3–5 year horizon.

### 3.3 Serviceable Obtainable Market (SOM) — 36 Months

**Year 1** (mainnet launch + Algorand stablecoin baskets + 2 institutional integrations):
- Target TVL: **$15M–$40M**
- Target monthly volume: **$80M–$200M**
- Target annual fees at 0.04%: **$400K–$1M**

**Year 2** (cross-chain via interoperability layer + LST baskets + RWA baskets):
- Target TVL: **$150M–$400M**
- Target monthly volume: **$800M–$2B**
- Target annual fees: **$4M–$10M**

**Year 3** (B2B routing layer + 5+ chain deployments + dominant Algorand-native AMM):
- Target TVL: **$500M–$1.5B**
- Target monthly volume: **$3B–$8B**
- Target annual fees: **$15M–$40M**

These are aggressive but bounded by precedent: Curve reached >$20B TVL within 24 months of launch. Uniswap V3 hit >$2B TVL in its first 6 months. Our differentiated capital efficiency means equivalent volume requires **far less** TVL — a strategic advantage in the post-incentive era when LPs are mercenary.

---

## 4. Target Users (Ideal Customer Profile)

We segment by *who pays us a basis point of friction today and would route to TaurusSwap to recover it.*

### 4.1 Primary Persona: The Stablecoin Yield LP

**Who.** DAO treasuries, family offices, crypto-native funds, and sophisticated retail providers managing **$100K–$50M** in stablecoin liquidity. Today they sit in Curve 3pool or Uniswap V3 USDC/USDT.

**Pain.** Curve underutilizes their capital (uniform exposure). Uniswap V3 fragments it across pair pools and burns gas every time they rebalance.

**TaurusSwap value.** Pick a depeg tolerance — e.g., `k=0.01` (the $0.99–$1.01 band) — and earn fees on capital concentrated where you'd actually deploy it. **One pool, n tokens, your tick, your rules.** Up to 150× capital efficiency at tight bands.

**Acquisition channel.** Direct outreach to DAO treasury committees, Algorand Foundation co-marketing, content on yield-optimization newsletters (Bankless, The Defiant, DL News).

### 4.2 Secondary Persona: The DEX Aggregator / Router

**Who.** 1inch, Paraswap, Jupiter (Solana), Vestige (Algorand), Tinyman router, and the next generation of intent-based solvers.

**Pain.** Multi-stablecoin routes today require 2–3 hops across Curve/Uniswap pools. Each hop is slippage, gas, and MEV exposure.

**TaurusSwap value.** A single pool quotes any-to-any swap among the basket. Better fill rate, lower slippage, atomic execution. We integrate via the SDK with a single method call.

**Acquisition channel.** Direct BD with aggregator teams, public benchmarks against Curve/Uniswap, partnership incentives (rebated fees during the integration ramp).

### 4.3 Tertiary Persona: The Application Developer / Wallet

**Who.** Wallets (Pera, Defly, Phantom-equivalent on Algorand), neobanks, payment processors, on/off-ramp providers, RWA platforms.

**Pain.** They need an SDK that abstracts the gnarly math and gives them quote-build-sign-submit in three lines. They cannot run a quartic solver in their app.

**TaurusSwap value.** `@taurusswap/sdk` is already on npm. Three lines of code, no contract knowledge required. The `sdk-react` package adds React hooks. The math runs in the user's browser; the contract verifies on-chain.

**Acquisition channel.** Developer relations, hackathon sponsorship (Algorand House at major events), tier-1 documentation, AI-assisted code samples baked into the docs site.

### 4.4 Strategic Persona: The Issuer of New Baskets

**Who.** New stablecoin issuers, RWA tokenizers, LST/LRT protocols, FX-on-chain issuers (EUR, JPY, INR, BRL stablecoins).

**Pain.** Bootstrapping liquidity for a new asset historically means paying a small fortune in incentive emissions to Curve gauges or Uniswap LPs. Day-1 liquidity is the gating problem for any new fungible asset.

**TaurusSwap value.** Launch your token directly into a multi-asset pool with existing liquidity. Day-1 depth without bootstrapping cost. We co-market the basket.

**Acquisition channel.** Inbound partnership pipeline — RWA platforms launching tokenized treasuries, regional stablecoin issuers seeking distribution.

---

## 5. Go-To-Market Strategy

### 5.1 The Three-Phase Rollout

**Phase 1 — Beachhead: Algorand Stablecoin Baskets (Months 0–6).**
Launch with a USDC / USDT / xUSD basket (Algorand-native stablecoins) on mainnet. Seed liquidity from foundation grant + matched LP incentives. Target: **$20M TVL, 1,000 LPs, integration into Pera and Defly wallets.**

Why this beachhead? Algorand has stablecoin liquidity that today routes through Tinyman (constant-product) and Folks (lending-style). There is no concentrated-liquidity AMM on Algorand. We arrive with an unambiguously superior product on a chain with no incumbent to displace.

**Phase 2 — Expand Within Chain: LST & RWA Baskets (Months 6–12).**
Add baskets for liquid-staked ALGO, governance-bonded tokens, RWA-stablecoins (tokenized T-bills, gold, FX). These are the "wide moat" asset classes — they want concentrated multi-asset pools but cannot get them anywhere else.

**Phase 3 — Cross-Chain (Months 12–24).**
Deploy on a second chain (likely a fast EVM L1/L2 — Monad, Berachain, or an OP-stack chain — where opcode budgets and finality permit O(1) verification economically). Use a cross-chain message layer (Wormhole, LayerZero) for pool-level intent routing. Establish Taurus as a multi-chain liquidity primitive, not just an Algorand DEX.

### 5.2 Distribution Channels & Tactical Plays

| Channel | Audience | Tactic | KPI |
|---|---|---|---|
| **Developer Relations** | App devs, wallets | SDK on npm, AI-friendly docs, hackathon prizes, RFP grants | # of apps integrated |
| **Aggregator Integrations** | 1inch, Vestige, Jupiter | Direct BD, fee rebates during ramp, public benchmarks | % of stablecoin volume routed through Taurus |
| **DAO Treasury Outreach** | Algorand-native + cross-chain DAOs | Direct emails, in-person at conferences, written treasury memos | # of treasuries with ≥$1M in TaurusSwap |
| **Content & Education** | Crypto-native LPs & devs | Math animations (Manim, on YouTube), Substack series, podcast circuit | Newsletter signups, doc traffic |
| **Liquidity Mining** | Mercenary LPs | Veta-style emissions on launch, sunset to fee-only after 9 months | TVL, retention after emissions sunset |
| **Strategic Partnerships** | Algorand Foundation, RWA platforms | Co-marketing, foundation grant, listed in their developer docs | # of co-launches |
| **Builder-Grade Tooling** | Power users, quants | Open-source Python reference simulator, public test vectors | GitHub stars, forks |

### 5.3 The "Land and Expand" Wedge

We land with **stablecoin LPs and aggregators** — the two highest-pain segments. Once we own stablecoin routing on Algorand, we expand into **LSTs, RWA baskets, and FX stablecoins** — categories where multi-asset concentration is even more valuable and where no competitor can follow without rewriting their math engine.

### 5.4 Pre-Launch Marketing Engine

We have already built the assets that most pre-launch DEX projects cannot:

- **Math animations** (Manim videos explaining sphere AMM, torus invariant, tick consolidation) — content that *only* a deeply technical team could produce, and that converts sophisticated investors and LPs.
- **Public reference simulator** in Python — ground-truth math that anyone can audit.
- **Full documentation** — nine technical papers (problem statement → smart contract → SDK → deployment).
- **Live testnet** + faucet + example Next.js application.

This positions us as the *credible* multi-asset concentrated AMM, not just one of several attempting it.

---

## 6. Revenue Model

We monetize four revenue streams, ordered by expected contribution at scale:

### 6.1 Swap Fee (Protocol Take)

**Mechanism.** Each swap pays a fee in basis points (configurable per pool). The pool keeps the majority and distributes to LPs; the protocol takes a fraction.

**Numbers.**
- **LP fee**: 1–10 bps depending on pool volatility (low for stablecoins, higher for LSTs).
- **Protocol take**: 10–20% of the LP fee, accruing to the protocol treasury (Curve and Uniswap V3 both use this split).

**Effective protocol rate**: **~0.2–2 bps per dollar swapped**.

At $3B monthly volume (Year 3 target), this is **$7M–$70M annual protocol revenue** — and that is *before* the higher-fee baskets (LST/RWA) which we expect to dominate the long tail.

### 6.2 Routing License (B2B)

**Mechanism.** Aggregators and wallets integrate our SDK to source quotes. Once integrated, we charge a tiny per-quote or per-fill fee for institutional usage, with generous free tiers for OSS projects.

**Why this is real.** Routing infrastructure is sticky. Once 1inch or Jupiter is built on top of Taurus, the switching cost is in months of engineering and trust. Compare: Pyth and Chainlink monetize the equivalent role in oracles for hundreds of millions per year.

### 6.3 Premium Pool Creation

**Mechanism.** Anyone can spin up a permissioned, branded basket pool (e.g., "ACME Treasury Basket: USDC/USDT/USDY/USDM") that uses TaurusSwap math under the hood. Pool creators set their own fee tier and earn a share; Taurus takes a small upfront + ongoing fee.

**Target customer.** RWA issuers, regional stablecoin issuers, tokenized treasury platforms.

### 6.4 Protocol-Owned Liquidity (POL)

**Mechanism.** A portion of protocol revenue is recycled into protocol-owned liquidity positions in the highest-volume pools. The protocol earns LP fees on its own positions, compounding revenue and reducing dependence on mercenary capital.

**Why this matters.** This is the Olympus DAO lesson, applied correctly: own a meaningful slice of your own pools so revenue is durable across LP rotation. We project POL contributing **15–25% of total revenue by Year 3**.

### 6.5 Revenue Mix (Year 3 Projected)

| Stream | Share of revenue | Sticky? |
|---|---|---|
| Swap fees | ~55% | Volume-dependent, recurring |
| B2B routing | ~20% | Highly sticky (integration cost) |
| Premium pools | ~10% | Sticky (per-issuer relationships) |
| Protocol-owned liquidity | ~15% | Compounding, partially sticky |

---

## 7. Monetization Hypothesis

We treat our revenue model as a set of falsifiable hypotheses, each with a kill criterion. Investors should be skeptical of any plan without these.

### H1: LPs will move stablecoin liquidity for 30–150× CE.

- **Predicted behavior.** Once Curve/Uniswap LPs see a working alternative with 30× CE at moderate bands, ≥10% of Algorand-routed stablecoin TVL migrates within 6 months of mainnet.
- **Why we believe it.** Capital efficiency is the single most-discussed metric in stablecoin LP forums. Uniswap V3 captured pair-stable TVL from V2 within months once CE was demonstrated.
- **Kill criterion.** If TVL fails to reach $5M by month 4 post-mainnet despite incentives, the hypothesis is wrong — investigate UX friction or fundamental LP skepticism.

### H2: Aggregators will route to Taurus once benchmarks prove ≥30 bps improvement on stablecoin trades >$100K.

- **Predicted behavior.** ≥3 aggregator integrations within 9 months of mainnet.
- **Why we believe it.** Aggregators compete on fill quality. They cannot ignore a 30 bps improvement.
- **Kill criterion.** If after 9 months only ≤1 integration, our SDK is either too hard to integrate or our benchmarks don't survive real-trade scrutiny.

### H3: Protocol fees compound faster than emissions burn.

- **Predicted behavior.** By month 18, monthly protocol fees exceed monthly emissions costs (positive contribution margin).
- **Why we believe it.** With 150× CE, our LPs need *less* token incentive per dollar of TVL because the underlying yield is structurally higher.
- **Kill criterion.** If emissions don't sunset by month 18, the unit economics don't work and we have to renegotiate the fee structure or change pool composition.

### H4: B2B routing becomes the durable revenue floor.

- **Predicted behavior.** By Year 3, B2B routing revenue exceeds 15% of total and is growing faster than swap-fee revenue.
- **Why we believe it.** This is the moat that survives any volatility in volumes.
- **Kill criterion.** If B2B revenue is still <5% by month 24, our infrastructure-narrative pivot fails — we are a DEX, not a primitive.

---

## 8. Why Algorand

This is the single most-questioned decision and the one we are most confident in. Our chain selection thesis has three legs.

### 8.1 Economic Viability of the Math

The torus invariant is mathematically elegant *only if* on-chain verification is cheap. On Ethereum L1, a single swap costs $1–$50 in gas — uneconomic for the small-trade segment (under $1,000) where TaurusSwap's CE advantage is most compelling. On most L2s, fees are $0.05–$0.50 — better, but still pricing out the long tail.

**Algorand executes a TaurusSwap swap for ~3,000 microalgo (~$0.001).** This is not a 10× improvement. It is a 1,000× improvement. It is what makes the small-trade, high-frequency, retail-and-aggregator market economically possible. Stablecoin swaps under $1,000 — which dominate transaction *count* if not volume — become viable.

### 8.2 Finality and User Experience

Algorand offers **3.3-second finality** with no reorgs. For an AMM:
- LPs see deposits and withdrawals confirm in the time it takes a user to read a confirmation modal.
- Aggregators get deterministic finality, eliminating MEV-style reorg attacks that plague Ethereum-based DEXes.
- Cross-chain message senders trust the finality without waiting for probabilistic confirmations.

### 8.3 Native Architectural Fit

Algorand's AVM offers:
- **Box storage** — perfect for our reserve, tick, and position state (variable-size, indexed by ID).
- **Atomic transaction groups** — every swap is a single group (transfer in + verification + transfer out + fee), guaranteed atomic.
- **ARC-4 ABI** — a typed contract interface that maps cleanly to our SDK.
- **Sub-cent fees + 700-opcode budget** — exactly the design space our O(1) torus equation was made for.

### 8.4 Strategic Alignment with the Algorand Ecosystem

Algorand is a chain with:
- Strong stablecoin presence (USDCa, USDTa) with growing institutional adoption.
- Active foundation funding for DeFi infrastructure.
- A vacuum in concentrated-liquidity AMM offerings (Tinyman is constant-product; Folks is lending-style; no concentrated-liquidity AMM exists at scale).
- A reputation for performance and regulatory clarity that attracts institutional LPs (treasuries, RWA issuers).

We are not just deploying on Algorand. We aim to become **the canonical DEX primitive of Algorand DeFi** — the way Curve was for Ethereum stablecoins in 2020.

### 8.5 The Diversification Counter-Argument and Our Answer

Critics ask: "Why not deploy on Ethereum first and capture the larger market?"

Three reasons:
1. **Cost economics.** Most stablecoin trades on Ethereum already lose CE advantage to gas. We would be selling a 30× CE product into a market where 20× of that benefit is eaten by transaction fees.
2. **Competitive density.** Ethereum has Curve, Uniswap V3, Maverick, Balancer, and a dozen others fighting for stablecoin LPs. Algorand has none.
3. **Architectural elegance.** Our math is designed for chains with O(1)-friendly opcode budgets and box-style state. Algorand maps. EVM does not without compromise.

We will deploy cross-chain in Year 2 — but from a position of strength, with a working flagship, a proven LP base, and demonstrated revenue.

---

## 9. Scalability Vision

Scalability for an AMM is three layers: **product, technical, and ecosystem.**

### 9.1 Product Scalability — From DEX to Primitive

**Year 1: TaurusSwap (the DEX).** A user-facing product. LPs deposit, traders swap, fees accrue.

**Year 2: Taurus Routing Layer.** SDK and on-chain routing infrastructure consumed by aggregators, wallets, and apps. Taurus moves from being a destination DEX to being **the multi-asset liquidity primitive that every Algorand and partner-chain application is built on**. Compare: in 2021, Curve transitioned from "the stablecoin DEX" to "the basis of half of EVM DeFi yield strategies." We are designed for that same transition.

**Year 3: Taurus Issuance Layer.** New stablecoins, LSTs, and RWA tokens launch into Taurus baskets directly. Day-1 liquidity becomes a feature, not a problem. We become the launch venue for new fungible assets.

### 9.2 Technical Scalability

The torus invariant is **already** O(1). The expensive computation (quartic solve) is **off-chain** in the SDK, where we can vertically scale by:
- Running the solver in WASM in the user's browser.
- Caching pool state with sub-second TTL.
- Operating quote-only RPC endpoints (paid tier for high-frequency clients).

**On-chain scalability vectors:**
- Multi-pool support per app (already designed) — one application object can host hundreds of pools.
- Tick limit: tested to n=5, mathematically supports n=10,000. Each additional token adds a constant verification cost.
- Cross-chain reserves via attested bridge messages — future state.

### 9.3 Ecosystem Scalability

The TaurusSwap moat compounds as:
- More baskets launch → more LPs → deeper liquidity → more aggregator routing → more fees → more LPs.
- More integrations → more lock-in.
- More chains → more cross-chain routing volume → more B2B revenue.

This is the *network effect* of liquidity, refined for an era where pool design (not pool count) is the differentiator.

### 9.4 18-Month Operating Plan

| Quarter | Milestone |
|---|---|
| **Q3 2026** | Mainnet launch with USDC/USDT/xUSD basket. Audit complete. Liquidity incentive program live. |
| **Q4 2026** | First aggregator integration. LST basket. Mobile UX in Pera & Defly wallets. |
| **Q1 2027** | RWA basket (tokenized treasuries). $100M TVL milestone. First B2B revenue. |
| **Q2 2027** | Cross-chain deployment (second L1). Cross-chain routing alpha. |
| **Q3 2027** | Second-chain mainnet. Premium pool creation product. |
| **Q4 2027** | Issuer-launch partnerships. POL program active. **Target: $500M TVL.** |

---

## 10. Competitive Landscape

| Competitor | Their model | Our edge |
|---|---|---|
| **Curve Finance** | Multi-asset, uniform LP | We give LPs concentration — same depth, 30–150× less capital. |
| **Uniswap V3** | Pair-only, concentrated LP | We extend concentration to n assets without fragmenting liquidity. |
| **Balancer** | Weighted multi-asset, uniform | We add concentration + a tighter invariant for stablecoins. |
| **Maverick** | Dynamic-fee CL on pairs | Pair-only; same fragmentation problem as UniV3 for stablecoin baskets. |
| **Tinyman (Algorand)** | Constant-product, pair-only | Same generational gap as UniV2 → UniV3 — but for multi-asset. |
| **Folks Finance (Algorand)** | Lending, not AMM | Different product, but they're an integration partner, not a competitor. |
| **DeltaPrime, Pact** | Constant-product variants on Algorand | We are the first concentrated-liquidity AMM on Algorand. |

**The defensibility checklist.**

| Moat type | Strength | Why |
|---|---|---|
| **Technical** | Strong | Implementation of Paradigm's June 2025 paper. 12-month head start. |
| **Network effects** | Building | TVL → routing volume → integrations → TVL. |
| **Brand / Reputation** | Building | Math animations, reference simulator, open docs — credibility-led marketing. |
| **Switching costs** | Strong (B2B) | SDK integrations take weeks to replace. |
| **Regulatory / Geographic** | Neutral | Algorand has clear regulatory positioning; we benefit indirectly. |

---

## 11. Traction — What Is Already Shipped

A go-to-market plan from a team that has shipped reads differently from one that hasn't. Here is what is live, today:

- **Smart contracts** — Algorand Python / ARC-4. Deployed and tested on Algorand testnet. 45/48 tests passing in CI.
- **Reference math simulator** — Python, fixed-point — covers sphere, polar, torus, ticks, consolidation, Newton solver, tick crossings, consolidation. Used as ground truth for both the contract and the SDK.
- **TypeScript SDK** — `@taurusswap/sdk`, published on npm. BigInt math engine, transaction builders, pool state reader.
- **React SDK** — `@taurusswap/sdk-react`, published on npm. React hooks: `useSwapQuote`, `usePoolState`, `usePoolStats`, `usePosition`.
- **Example application** — a fully functional Next.js app demonstrating swap, liquidity, and pool inspection — wired to live testnet.
- **Documentation site** — frontend with progressive disclosure: introduction → math → SDK → API reference.
- **Math animations** — six Manim videos explaining the underlying math. Production-quality, suitable for conference talks and investor decks.
- **Faucet** — for testnet onboarding.

**No vaporware. The math works, the contracts deploy, the SDK is on npm. Investors can `npm install @taurusswap/sdk` and read the code today.**

---

## 12. Team

We are a five-person founding team with a deliberate composition:
- **Protocol & math**: a contributor who reads Paradigm papers and turns them into shipping code.
- **Contract engineering**: an Algorand-native engineer with experience deploying ARC-4 contracts at scale.
- **SDK & full-stack**: a TypeScript engineer who built the SDK, React hooks, and example application.
- **Frontend**: a designer-engineer hybrid responsible for the docs site and consumer-grade UX.
- **Strategy & GTM**: a business operator responsible for partnerships, fundraising, and this plan.

We have shipped together. The code in this repository is signal: every contributor has visible commits on the contract, SDK, frontend, and docs.

---

## 13. Risks & Mitigations

A plan without honest risks is a pitch, not a plan. Here are the risks we lose sleep over.

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Smart contract vulnerability** | Medium | Critical | Two independent audits (one Algorand-specialist, one general); $250K bug bounty; reference simulator catches math regressions in CI. |
| **Cold-start liquidity** | High | High | Foundation grant + 9-month emissions program; integration with Pera/Defly for retail wallet flow. |
| **Algorand-chain risk** | Low–Medium | High | Diversify cross-chain in Year 2 (planned, not panic-driven). |
| **Competing EVM port of Orbital paper** | Medium | Medium | We have a 12-month implementation lead and the chain-fit advantage. Speed and execution win. |
| **LP misunderstanding of ticks** | Medium | Medium | Education-first marketing; one-click LP UX (preset tick bands); risk visualization in the frontend. |
| **Aggregator integration latency** | Medium | Medium | Direct BD, fee rebates during ramp; first-party aggregator as a fallback. |
| **Stablecoin regulatory shock** | Low | High | Diversify into LSTs, RWA, FX baskets early. |
| **MEV / oracle attack** | Low | High | Algorand's near-instant finality + atomic txn groups + no public mempool reduce MEV surface; we are still publishing a formal MEV analysis pre-mainnet. |

---

## 14. The Ask

We are raising a **seed round** to fund:

| Use of proceeds | Allocation |
|---|---|
| Engineering (mainnet, audits, cross-chain) | ~45% |
| Liquidity bootstrapping (incentives, POL seed) | ~25% |
| Business development & integrations | ~15% |
| Marketing, content, conferences | ~10% |
| Legal, operations, contingency | ~5% |

**12-month runway**, ending with:
- Mainnet live, audited.
- ≥$30M TVL.
- ≥2 aggregator integrations.
- ≥1 institutional B2B contract.
- Positive monthly contribution margin within 18 months.

---

## 15. The Closing Argument

Every era of DeFi has had one defining liquidity primitive.

- **2018–2020:** Uniswap V2's constant product. It made AMMs work at all.
- **2020–2022:** Curve's stableswap. It made stablecoin trading economically real.
- **2021–2024:** Uniswap V3's concentrated liquidity. It made capital efficiency competitive with order books.

Each successive primitive captured a generational share of fees and built a moat that incumbents could not cross without rewriting their math.

**The next primitive is multi-asset concentrated liquidity.** The math was published by Paradigm in June 2025. The first team to ship a production implementation, on a chain whose economics make it viable, on top of a stablecoin market that has crossed $250B and is still doubling — will own the category for the next cycle.

That team is Taurus.

We have the implementation. We have the chain. We have the SDK and the docs and the animations and the tests. We have the only seat at this table.

**We are asking you to fund the launch, the audit, and the liquidity bootstrap to make it inevitable.**

---

## Appendix A — Reference Material

- **Mathematical foundations**: `docs/02-mathematical-foundations.md`
- **Torus invariant derivation**: `docs/03-torus-invariant.md`
- **Tick mechanics & capital efficiency**: `docs/04-tick-mechanics.md`
- **Smart contract architecture**: `docs/06-smart-contract.md`
- **SDK reference**: `docs/07-sdk.md` and `packages/sdk/README.md`
- **Original Paradigm paper**: White, Robinson, Moallemi — *Orbital* — June 2025 — paradigm.xyz/2025/06/orbital
- **Live SDK**: `npm install @taurusswap/sdk`
- **Repository**: github.com/Kaushik2003/TaurusProtocol

## Appendix B — Glossary

- **Tick**: a spherical cap on the n-sphere; an LP position parameterized by depeg tolerance `k`.
- **Torus invariant**: the consolidated equation `f(Σxᵢ, Σxᵢ²) = 0` that the contract verifies.
- **Capital efficiency**: virtual liquidity ÷ actual capital deposited. Concentrated LPs achieve 30–150× at relevant peg bands.
- **Consolidation**: the algebraic collapse of multiple ticks into two summary spheres → one torus.
- **POL**: Protocol-Owned Liquidity. Liquidity held by the protocol treasury in its own pools.
- **B2B routing**: institutional / aggregator usage of the SDK and on-chain routes, monetized via licensing or fee share.

---

*Taurus Protocol — Compute off-chain. Verify on-chain. Trade without limits.*
