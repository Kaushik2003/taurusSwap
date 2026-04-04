---
name: Frontend Integration PRD — Orbital AMM
description: Key decisions and architecture for integrating the frontend and SDK with the v3 OrbitalPool contract
type: project
---

PRD written at FRONTEND_INTEGRATION_PRD.md covering SDK v1→v3 bug fixes and full frontend rewrite.

**Why:** Demo frontend mimics Uniswap (mock prices, two tokens, hardcoded positions). SDK has v1-era code incompatible with v3 contract (wrong box names, wrong TickData layout, wrong deposit amount units).

**How to apply:** Follow the PRD's §2 (SDK fixes) before touching frontend. The scale system (AMOUNT_SCALE = 1000 for math, PRECISION = 10^9 for sqrt only) is documented in §1 and must be understood before any SDK edit.

Critical SDK bugs:
- `decodeTickBox` reads 57-byte v1 format; contract now stores 25 bytes (no lp_address field)
- `buildRemoveLiquidityGroup` references removed "fees" box — must be "fee_growth" + "pos:" box
- Deposit amount passed as AMOUNT_SCALE units but contract expects raw microunits (× 1000)
- `tickId` prediction is wrong; must use `numTicks` from global state
- `claimFees` transaction builder is completely missing from SDK
