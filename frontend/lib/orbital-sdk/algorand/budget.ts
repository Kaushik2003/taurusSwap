import { OPCODE_BUDGET_PER_TXN } from "../constants";

/**
 * Compute how many budget() dummy transactions to prepend to an atomic group.
 *
 * The contract's heavy operations (claim_fees, remove_liquidity) iterate n
 * times for fee settling + n inner sends.  For n=5 the contract requires at
 * least 2 extra budget transactions.
 *
 * Formula:
 *   base budget  = baseCost + crossingCost × numCrossings
 *   n overhead   = extra budget needed for per-token loops (ceil(n / 2))
 *   total needed = (base + n_overhead) × 1.5 safety margin
 *   extra txns   = ceil((total - one_txn_budget) / one_txn_budget)
 *
 * @param numCrossings  number of tick crossings in this trade (0 for non-swap ops)
 * @param n             number of tokens in the pool (default 2 for simple ops)
 */
export function computeRequiredBudget(numCrossings: number, n = 2): number {
  const baseCost = 300;
  const crossingCost = 400;
  // Each additional token beyond the first costs ~100 opcodes in the loops
  const nOverhead = Math.max(0, (n - 2) * 100);
  const totalCost = (baseCost + crossingCost * numCrossings + nOverhead) * 1.5;

  const additionalNeeded = Math.max(
    0,
    Math.ceil((totalCost - OPCODE_BUDGET_PER_TXN) / OPCODE_BUDGET_PER_TXN),
  );

  return Math.min(additionalNeeded, 14);
}
