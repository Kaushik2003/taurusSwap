export class TaurusError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "TaurusError";
  }
}

export class SwapTooSmallError extends TaurusError {
  constructor() {
    super(
      "Amount too small after fee deduction and scaling (minimum ~1000 microunits)",
      "SWAP_TOO_SMALL",
    );
  }
}

export class InsufficientLiquidityError extends TaurusError {
  constructor() {
    super("Trade too large for available liquidity", "INSUFFICIENT_LIQUIDITY");
  }
}

export class TickNotFoundError extends TaurusError {
  constructor(tickId: number) {
    super(`Tick #${tickId} not found in pool`, "TICK_NOT_FOUND");
  }
}

export class InvalidTickParamsError extends TaurusError {
  constructor(reason = "deposit would be zero or negative") {
    super(`Invalid tick parameters: ${reason}`, "INVALID_TICK_PARAMS");
  }
}

export class InvalidSlippageError extends TaurusError {
  constructor(bps: number) {
    super(
      `slippageBps ${bps} is out of range (must be 0–10000)`,
      "INVALID_SLIPPAGE",
    );
  }
}

export class ZapAmountTooSmallError extends TaurusError {
  constructor() {
    super(
      "Amount too small to split across pool tokens (need at least 1000 microunits per token)",
      "ZAP_TOO_SMALL",
    );
  }
}

export class IndexerNotConfiguredError extends TaurusError {
  constructor() {
    super(
      "Indexer URL not configured — pass indexerUrl in TaurusClientConfig",
      "INDEXER_NOT_CONFIGURED",
    );
  }
}
