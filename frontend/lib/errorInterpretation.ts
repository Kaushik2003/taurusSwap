/**
 * Interprets technical Algorand/AVM/Orbital errors into human-readable messages.
 */
export function interpretTransactionError(error: any): { title: string; message: string; action?: string } {
  const msg = (error?.message || String(error)).toLowerCase();

  // ── Network & Balance ────────────────────────────────────────────────────────
  if (msg.includes("overspend") || msg.includes("balance not enough")) {
    return {
      title: "Insufficient Balance",
      message: "Your account does not have enough tokens or ALGO to cover the transaction and network fees.",
      action: "Please add more funds to your wallet and try again."
    };
  }

  // ── Smart Contract Assertions ────────────────────────────────────────────────
  if (msg.includes("pc=1281") || msg.includes("pushint 4; ==; assert")) {
    return {
      title: "Protocol Context Error",
      message: "The pool contract requires full asset context to verify stability. We have updated your request format to include all tokens.",
      action: "Try again — the updated request should satisfy the contract."
    };
  }

  if (msg.includes("logic eval error")) {
    if (msg.includes("assert failed")) {
      return {
        title: "Contract Protection Triggered",
        message: "The protocol's safety checks prevented this action. This often happens if the price moved too much during your transaction (slippage).",
        action: "Try adjusting your price bounds or increasing your slippage tolerance."
      };
    }
  }

  // ── Resource Limits ──────────────────────────────────────────────────────────
  if (msg.includes("maxapptotaltxnreferences")) {
    return {
      title: "Transaction Complexity Limit",
      message: "The network cannot process this many asset references in a single step.",
      action: "We have refactored the request to spread resources across multiple steps. Please try again."
    };
  }

  // ── Grouping Errors ──────────────────────────────────────────────────────────
  if (msg.includes("incomplete group") || msg.includes("transactiongroup")) {
    return {
      title: "Transaction Integrity Error",
      message: "The atomic group of transactions was incomplete or signatures were dropped by the wallet.",
      action: "Ensure your wallet app is open and you approve all requests in the sequence."
    };
  }

  // ── Default ──────────────────────────────────────────────────────────────────
  return {
    title: "Action Failed",
    message: error?.message || "An unexpected error occurred while communicating with the blockchain.",
    action: "Check your wallet connectivity or try again in a moment."
  };
}
