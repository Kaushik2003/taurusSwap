import algosdk from "algosdk";
import { DEFAULT_SLIPPAGE_BPS, AMOUNT_SCALE } from "./constants";
import { readPoolState, readPosition } from "./pool/state-reader";
import { getSwapQuote, buildSwapTxns } from "./pool/swap";
import { getAllPrices, getCapitalEfficiencyForDepegPrice } from "./pool/quote";
import { tickParamsFromDepegPrice } from "./pool/liquidity";
import {
  buildAddTickGroup,
  buildRemoveLiquidityGroup,
  buildClaimFeesGroup,
} from "./algorand/transactions";
import { equalPricePoint } from "./math/sphere";
import { xMin } from "./math/ticks";
import type { PoolState, SwapQuote, PositionInfo } from "./types";

const TESTNET_ALGOD_URL = "https://testnet-api.algonode.cloud";
const TESTNET_POOL_APP_ID = 758284478;

// ── Config & param types ──────────────────────────────────────────────────────

export interface TaurusClientConfig {
  algodUrl?: string;
  algodToken?: string;
  algodPort?: number;
  poolAppId?: number;
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
  /** Tick radius in AMOUNT_SCALE units. Use tickParamsFromDepegPrice() to compute. */
  r: bigint;
  /** Tick plane constant in AMOUNT_SCALE units. Use tickParamsFromDepegPrice() to compute. */
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

// ── TaurusClient ──────────────────────────────────────────────────────────────

/**
 * High-level client for the TaurusSwap AMM on Algorand.
 *
 * Usage:
 *   const client = new TaurusClient();           // defaults to testnet
 *   const quote  = await client.quote({ fromIndex: 0, toIndex: 1, amountIn: 1_000_000n });
 *   const txns   = await client.buildSwapTxns({ sender, ...quote });
 *   // sign txns with your wallet, then submit
 */
export class TaurusClient {
  readonly algod: algosdk.Algodv2;
  readonly poolAppId: number;

  constructor(config: TaurusClientConfig = {}) {
    this.algod = new algosdk.Algodv2(
      config.algodToken ?? "",
      config.algodUrl ?? TESTNET_ALGOD_URL,
      config.algodPort,
    );
    this.poolAppId = config.poolAppId ?? TESTNET_POOL_APP_ID;
  }

  // ── State ───────────────────────────────────────────────────────────────────

  /** Fetch the full pool state from the Algorand node. */
  async getPoolState(): Promise<PoolState> {
    return readPoolState(this.algod, this.poolAppId);
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

  // ── Quotes ──────────────────────────────────────────────────────────────────

  /**
   * Compute a swap quote off-chain. No transaction is built or sent.
   *
   * All amounts in raw microunits (1 USDC = 1_000_000n).
   */
  async quote(params: QuoteParams): Promise<SwapQuote> {
    const pool = await this.getPoolState();
    return getSwapQuote(pool, params.fromIndex, params.toIndex, params.amountIn);
  }

  /**
   * Returns the current spot price of every token relative to baseTokenIdx.
   * Index 0 always returns 1.0.
   */
  async getAllPrices(baseTokenIdx = 0): Promise<number[]> {
    const pool = await this.getPoolState();
    return getAllPrices(pool, baseTokenIdx);
  }

  // ── Transaction builders ─────────────────────────────────────────────────────

  /**
   * Build an unsigned swap transaction group.
   *
   * Sign the returned transactions with your wallet and submit them to the network.
   * The group is already assembled and group-ID-assigned.
   */
  async buildSwapTxns(params: BuildSwapParams): Promise<algosdk.Transaction[]> {
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
   *
   * Compute r and k using tickParamsFromDepegPrice() before calling this.
   * Returns txns + the deposit amount per token (so you can show it to the user).
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
    if (xMinVal >= q) {
      throw new Error(
        "Invalid tick parameters: xMin >= equalPricePoint (deposit would be zero or negative)",
      );
    }

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

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Convert a human-readable depeg price (e.g. 0.99) and desired deposit per token
   * into (r, k) tick parameters for buildAddLiquidityTxns().
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
   * Compute capital efficiency for a given depeg price.
   * Higher efficiency = more trading volume per dollar of capital locked.
   */
  async getCapitalEfficiency(
    depegPrice: number,
    tickRadius: bigint,
  ): Promise<{ k: bigint; efficiency: number; depositPerToken: bigint }> {
    const pool = await this.getPoolState();
    return getCapitalEfficiencyForDepegPrice(pool, depegPrice, tickRadius);
  }
}
