import algosdk from "algosdk";
import { AMOUNT_SCALE, DEFAULT_SLIPPAGE_BPS } from "./constants";
import { readPoolState, readPosition } from "./pool/state-reader";
import { getSwapQuote, buildSwapTxns } from "./pool/swap";
import { getAllPrices, getCapitalEfficiencyForDepegPrice } from "./pool/quote";
import { tickParamsFromDepegPrice } from "./pool/liquidity";
import { computeZap } from "./pool/zap";
import {
  buildAddTickGroup,
  buildRemoveLiquidityGroup,
  buildClaimFeesGroup,
} from "./algorand/transactions";
import { equalPricePoint } from "./math/sphere";
import { xMin } from "./math/ticks";
import { fetchPoolStats, fetchTransactions } from "./indexer";
import {
  InvalidTickParamsError,
  InvalidSlippageError,
  TickNotFoundError,
} from "./errors";
import type { PoolState, SwapQuote, PositionInfo } from "./types";
import type { ZapPlan } from "./pool/zap";
import type { PoolStats, AMMTransaction } from "./indexer";

// ── Defaults ──────────────────────────────────────────────────────────────────

const TESTNET_ALGOD_URL = "https://testnet-api.algonode.cloud";
const TESTNET_INDEXER_URL = "https://testnet-idx.algonode.cloud";
const TESTNET_POOL_APP_ID = 758284478;

// ── Config & param types ──────────────────────────────────────────────────────

export interface TaurusClientConfig {
  algodUrl?: string;
  algodToken?: string;
  algodPort?: number;
  indexerUrl?: string;
  indexerToken?: string;
  poolAppId?: number;
  /** Pool state cache TTL in ms. Default 10 000 (10s). Set to 0 to disable. */
  cacheTtlMs?: number;
}

export interface QuoteParams {
  fromIndex: number;
  toIndex: number;
  amountIn: bigint;
}

export interface BuildSwapParams {
  sender: string;
  fromIndex: number;
  toIndex: number;
  amountIn: bigint;
  slippageBps?: number;
}

export interface BuildAddLiquidityParams {
  sender: string;
  /** Tick radius in AMOUNT_SCALE units — compute with tickParamsFromDepegPrice() */
  r: bigint;
  /** Tick plane constant in AMOUNT_SCALE units — compute with tickParamsFromDepegPrice() */
  k: bigint;
}

export interface BuildRemoveLiquidityParams {
  sender: string;
  tickId: number;
  shares: bigint;
}

export interface BuildClaimFeesParams {
  sender: string;
  tickId: number;
}

export interface BuildZapParams {
  sender: string;
  /** Index of the single token the user is depositing */
  sourceTokenIdx: number;
  /** Total amount of source token in raw microunits */
  totalAmountRaw: bigint;
  /** Depeg boundary for the tick position to open after zapping */
  depegPrice: number;
  slippageBps?: number;
}

export interface EstimateRemovalResult {
  /** Pro-rata token amounts you'd receive, in raw microunits */
  receivePerTokenRaw: bigint[];
  /** Accrued fees claimable at removal, in raw microunits */
  claimableFeesRaw: bigint[];
}

export interface EstimateAPRResult {
  /** Annualised percentage yield (e.g. 0.12 = 12%) */
  apr: number;
  /** Estimated daily fee earnings in USD */
  dailyFeeUsd: number;
  /** Capital efficiency multiplier vs. a full-range pool */
  efficiencyMultiplier: number;
  tickRadius: bigint;
}

// ── Internal cache ────────────────────────────────────────────────────────────

interface CachedPoolState {
  state: PoolState;
  fetchedAt: number;
}

// ── TaurusClient ──────────────────────────────────────────────────────────────

/**
 * High-level client for the TaurusSwap AMM on Algorand.
 *
 * All build* methods return unsigned algosdk.Transaction[] — sign with your
 * wallet (Pera, Defly, etc.) and submit via algod.sendRawTransaction().
 *
 * Quick start:
 *   const client = new TaurusClient();
 *   const quote  = await client.quote({ fromIndex: 0, toIndex: 1, amountIn: 1_000_000n });
 *   const txns   = await client.buildSwapTxns({ sender, fromIndex: 0, toIndex: 1, amountIn: 1_000_000n });
 */
export class TaurusClient {
  readonly algod: algosdk.Algodv2;
  readonly poolAppId: number;

  private readonly _indexer: algosdk.Indexer;
  private _cache: CachedPoolState | null = null;
  private readonly _cacheTtlMs: number;

  constructor(config: TaurusClientConfig = {}) {
    this.algod = new algosdk.Algodv2(
      config.algodToken ?? "",
      config.algodUrl ?? TESTNET_ALGOD_URL,
      config.algodPort,
    );
    this.poolAppId = config.poolAppId ?? TESTNET_POOL_APP_ID;
    this._cacheTtlMs = config.cacheTtlMs ?? 10_000;
    this._indexer = new algosdk.Indexer(
      config.indexerToken ?? "",
      config.indexerUrl ?? TESTNET_INDEXER_URL,
      undefined,
    );
  }

  // ── Cache ────────────────────────────────────────────────────────────────────

  /** Force-evict the cached pool state. Next getPoolState() call will re-fetch. */
  invalidateCache(): void {
    this._cache = null;
  }

  // ── State ────────────────────────────────────────────────────────────────────

  /**
   * Fetch the full pool state. Results are cached for cacheTtlMs (default 10s).
   * Pass forceRefresh=true to bypass the cache.
   */
  async getPoolState(forceRefresh = false): Promise<PoolState> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this._cache &&
      this._cacheTtlMs > 0 &&
      now - this._cache.fetchedAt < this._cacheTtlMs
    ) {
      return this._cache.state;
    }
    const state = await readPoolState(this.algod, this.poolAppId);
    this._cache = { state, fetchedAt: now };
    return state;
  }

  /**
   * Read one LP's position for a specific tick.
   * Returns null if the address has no position in that tick.
   */
  async getPosition(
    address: string,
    tickId: number,
  ): Promise<PositionInfo | null> {
    const pool = await this.getPoolState();
    const tick = pool.ticks.find((t) => t.id === tickId);
    if (!tick) return null;
    return readPosition(
      this.algod,
      this.poolAppId,
      address,
      tickId,
      pool.n,
      pool.feeGrowth,
      tick,
    );
  }

  // ── Quotes ───────────────────────────────────────────────────────────────────

  /**
   * Compute a swap quote off-chain — no transaction is built or sent.
   * All amounts in raw microunits (1 USDC = 1_000_000n).
   */
  async quote(params: QuoteParams): Promise<SwapQuote> {
    const pool = await this.getPoolState();
    return getSwapQuote(pool, params.fromIndex, params.toIndex, params.amountIn);
  }

  /** Spot price of every token relative to baseTokenIdx (index 0 always = 1.0). */
  async getAllPrices(baseTokenIdx = 0): Promise<number[]> {
    const pool = await this.getPoolState();
    return getAllPrices(pool, baseTokenIdx);
  }

  // ── Zap ──────────────────────────────────────────────────────────────────────

  /**
   * Plan a single-token deposit: compute how to split one source token into
   * equal amounts of all n pool tokens. Pure — no extra network calls.
   */
  async computeZap(
    sourceTokenIdx: number,
    totalAmountRaw: bigint,
  ): Promise<ZapPlan> {
    const pool = await this.getPoolState();
    return computeZap(pool, sourceTokenIdx, totalAmountRaw);
  }

  /**
   * Build all transaction groups needed for a single-token liquidity deposit (zap).
   *
   * Returns:
   *   swapTxnGroups    — one txn group per swap (sign + submit each sequentially)
   *   addLiquidityTxns — final add_tick group (sign + submit after all swaps)
   *   plan             — the ZapPlan used (amounts, price impact)
   */
  async buildZapTxns(params: BuildZapParams): Promise<{
    swapTxnGroups: algosdk.Transaction[][];
    addLiquidityTxns: algosdk.Transaction[];
    plan: ZapPlan;
  }> {
    const pool = await this.getPoolState();
    const plan = computeZap(pool, params.sourceTokenIdx, params.totalAmountRaw);
    const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

    const swapTxnGroups: algosdk.Transaction[][] = [];
    for (const swap of plan.swaps) {
      swapTxnGroups.push(
        await buildSwapTxns(
          this.algod,
          this.poolAppId,
          params.sender,
          pool,
          swap.fromIdx,
          swap.toIdx,
          swap.amountIn,
          slippageBps,
        ),
      );
    }

    const { r, k } = tickParamsFromDepegPrice(
      params.depegPrice,
      plan.depositPerToken,
      pool.n,
      pool.sqrtN,
      pool.invSqrtN,
    );
    const { txns: addLiquidityTxns } = await this.buildAddLiquidityTxns({
      sender: params.sender,
      r,
      k,
    });

    return { swapTxnGroups, addLiquidityTxns, plan };
  }

  // ── Transaction builders ──────────────────────────────────────────────────────

  /**
   * Build an unsigned swap transaction group.
   * Sign the returned transactions with your wallet and submit.
   */
  async buildSwapTxns(params: BuildSwapParams): Promise<algosdk.Transaction[]> {
    if (
      params.slippageBps !== undefined &&
      (params.slippageBps < 0 || params.slippageBps > 10_000)
    ) {
      throw new InvalidSlippageError(params.slippageBps);
    }
    const pool = await this.getPoolState();
    return buildSwapTxns(
      this.algod,
      this.poolAppId,
      params.sender,
      pool,
      params.fromIndex,
      params.toIndex,
      params.amountIn,
      params.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    );
  }

  /**
   * Build an unsigned add-liquidity transaction group.
   * Compute r and k first using tickParamsFromDepegPrice().
   */
  async buildAddLiquidityTxns(params: BuildAddLiquidityParams): Promise<{
    txns: algosdk.Transaction[];
    depositPerTokenRaw: bigint;
    tickId: number;
  }> {
    const pool = await this.getPoolState();
    const { n, sqrtN, invSqrtN, tokenAsaIds, numTicks } = pool;

    const q = equalPricePoint(params.r, invSqrtN);
    const xMinVal = xMin(params.r, params.k, n, sqrtN);
    if (xMinVal >= q) throw new InvalidTickParamsError();

    const depositPerTokenRaw = (q - xMinVal) * AMOUNT_SCALE;
    const tickId = numTicks;

    const txns = await buildAddTickGroup(
      this.algod,
      this.poolAppId,
      params.sender,
      n,
      tokenAsaIds,
      depositPerTokenRaw,
      params.r,
      params.k,
      tickId,
    );

    return { txns, depositPerTokenRaw, tickId };
  }

  /**
   * Build an unsigned remove-liquidity transaction group.
   * Pass the full tick.totalShares to fully exit a position.
   */
  async buildRemoveLiquidityTxns(
    params: BuildRemoveLiquidityParams,
  ): Promise<algosdk.Transaction[]> {
    const pool = await this.getPoolState();
    return buildRemoveLiquidityGroup(
      this.algod,
      this.poolAppId,
      params.sender,
      pool.tokenAsaIds,
      params.tickId,
      params.shares,
    );
  }

  /** Build an unsigned claim-fees transaction group. */
  async buildClaimFeesTxns(
    params: BuildClaimFeesParams,
  ): Promise<algosdk.Transaction[]> {
    const pool = await this.getPoolState();
    return buildClaimFeesGroup(
      this.algod,
      this.poolAppId,
      params.sender,
      pool.tokenAsaIds,
      params.tickId,
    );
  }

  // ── Estimation ───────────────────────────────────────────────────────────────

  /**
   * Estimate what an LP would receive by removing shares from a tick, before
   * building or submitting any transaction.
   *
   * receivePerTokenRaw: pro-rata share of actual reserves.
   * claimableFeesRaw:   accrued fees (requires an on-chain position lookup).
   */
  async estimateRemoval(
    address: string,
    tickId: number,
    shares: bigint,
  ): Promise<EstimateRemovalResult> {
    const pool = await this.getPoolState();
    const tick = pool.ticks.find((t) => t.id === tickId);
    if (!tick) throw new TickNotFoundError(tickId);

    const positionR =
      tick.totalShares > 0n ? (tick.r * shares) / tick.totalShares : 0n;

    const receivePerTokenRaw =
      pool.totalR > 0n
        ? pool.actualReservesRaw.map((r) => (positionR * r) / pool.totalR)
        : pool.actualReservesRaw.map(() => 0n);

    const position = await readPosition(
      this.algod,
      this.poolAppId,
      address,
      tickId,
      pool.n,
      pool.feeGrowth,
      tick,
    );
    const claimableFeesRaw =
      position?.claimableFees ?? new Array(pool.n).fill(0n);

    return { receivePerTokenRaw, claimableFeesRaw };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Convert a human-readable depeg price and target deposit into (r, k) tick
   * parameters for buildAddLiquidityTxns().
   */
  async tickParamsFromDepegPrice(
    depegPrice: number,
    depositPerTokenRaw: bigint,
  ): Promise<{ r: bigint; k: bigint }> {
    const pool = await this.getPoolState();
    return tickParamsFromDepegPrice(
      depegPrice,
      depositPerTokenRaw,
      pool.n,
      pool.sqrtN,
      pool.invSqrtN,
    );
  }

  /**
   * Capital efficiency for a given depeg price — higher means more fee earnings
   * per dollar of capital locked.
   */
  async getCapitalEfficiency(
    depegPrice: number,
    tickRadius: bigint,
  ): Promise<{ k: bigint; efficiency: number; depositPerToken: bigint }> {
    const pool = await this.getPoolState();
    return getCapitalEfficiencyForDepegPrice(pool, depegPrice, tickRadius);
  }

  // ── Indexer queries ───────────────────────────────────────────────────────────

  /**
   * Fetch 24-hour pool statistics from the Algorand Indexer.
   * Uses AlgoNode testnet indexer by default.
   */
  async getPoolStats(): Promise<PoolStats> {
    const pool = await this.getPoolState();
    const tvlUsd =
      pool.actualReservesRaw.reduce((sum, r) => sum + Number(r), 0) / 1e6;
    return fetchPoolStats(
      this._indexer,
      this.poolAppId,
      tvlUsd,
      Number(pool.feeBps),
      pool.ticks.length,
    );
  }

  /**
   * Fetch recent AMM transactions from the Algorand Indexer.
   * Optionally filter by sender address.
   */
  async getTransactions(
    options: { address?: string; limit?: number } = {},
  ): Promise<AMMTransaction[]> {
    return fetchTransactions(this._indexer, this.poolAppId, options);
  }

  // ── APR estimator ─────────────────────────────────────────────────────────────

  /**
   * Estimate the annualised fee yield for a new position.
   *
   * Combines 24h on-chain fee volume with the position's capital efficiency
   * multiplier to project returns. Requires indexer access.
   *
   * @param depegPrice         Desired tick boundary (e.g. 0.99)
   * @param depositPerTokenRaw Planned deposit per token in raw microunits
   */
  async estimateAPR(
    depegPrice: number,
    depositPerTokenRaw: bigint,
  ): Promise<EstimateAPRResult> {
    const [pool, stats] = await Promise.all([
      this.getPoolState(),
      this.getPoolStats(),
    ]);

    const { r: tickRadius } = tickParamsFromDepegPrice(
      depegPrice,
      depositPerTokenRaw,
      pool.n,
      pool.sqrtN,
      pool.invSqrtN,
    );

    const { efficiency } = getCapitalEfficiencyForDepegPrice(
      pool,
      depegPrice,
      tickRadius,
    );

    // Base APR = annualised pool fees / TVL; my position earns efficiency× more per dollar
    const baseApr =
      stats.tvlUsd > 0 ? (stats.fees24hUsd * 365) / stats.tvlUsd : 0;
    const apr = baseApr * efficiency;

    const depositUsd = (Number(depositPerTokenRaw) / 1e6) * pool.n;
    const dailyFeeUsd =
      stats.tvlUsd > 0 && depositUsd > 0
        ? stats.fees24hUsd * (depositUsd / stats.tvlUsd) * efficiency
        : 0;

    return { apr, dailyFeeUsd, efficiencyMultiplier: efficiency, tickRadius };
  }
}
