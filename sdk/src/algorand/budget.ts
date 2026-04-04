import { OPCODE_BUDGET_PER_TXN } from "../constants";

export function computeRequiredBudget(numCrossings: number): number {
  const baseCost = 300;
  const crossingCost = 400;
  const totalCost = baseCost + crossingCost * numCrossings;
  const requiredBudget = Math.ceil(totalCost * 1.5);

  const additionalNeeded = Math.max(
    0,
    Math.ceil((requiredBudget - OPCODE_BUDGET_PER_TXN) / OPCODE_BUDGET_PER_TXN),
  );

  return Math.min(additionalNeeded, 14);
}
