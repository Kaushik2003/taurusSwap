/**
 * Example: swap 100 USDC → USDT using TaurusSwap SDK.
 *
 * Run with:  npx tsx examples/swap.ts
 *
 * You need:
 *   - An Algorand testnet account with USDC (ASA 758284451)
 *   - algosdk installed: npm install algosdk
 */
import algosdk from "algosdk";
import { TaurusClient } from "../src/index";

// ─── Config ───────────────────────────────────────────────────────────────────
const SENDER = "YOUR_ALGORAND_ADDRESS";
const MNEMONIC = "your twenty five word mnemonic phrase ...";

const TOKEN_IN_IDX = 0;  // USDC (index 0 in the pool)
const TOKEN_OUT_IDX = 1; // USDT (index 1 in the pool)
const AMOUNT_IN = 100_000_000n; // 100 USDC (6 decimals → 100 × 10^6 microunits)

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const client = new TaurusClient(); // defaults to testnet

  // 1. Get a quote (no transactions built yet)
  console.log("Fetching quote...");
  const quote = await client.quote({
    fromIndex: TOKEN_IN_IDX,
    toIndex: TOKEN_OUT_IDX,
    amountIn: AMOUNT_IN,
  });

  const amountOutHuman = Number(quote.amountOut) / 1e6;
  console.log(`Quote: 100 USDC → ${amountOutHuman.toFixed(6)} USDT`);
  console.log(`Price impact: ${(quote.priceImpact * 100).toFixed(4)}%`);
  console.log(`Ticks crossed: ${quote.ticksCrossed}`);

  // 2. Build unsigned transaction group
  console.log("\nBuilding swap transactions...");
  const txns = await client.buildSwapTxns({
    sender: SENDER,
    fromIndex: TOKEN_IN_IDX,
    toIndex: TOKEN_OUT_IDX,
    amountIn: AMOUNT_IN,
    slippageBps: 50, // 0.5% slippage tolerance
  });
  console.log(`Transaction group: ${txns.length} txn(s)`);

  // 3. Sign with your wallet
  // In a real app this would be your wallet's sign method, e.g.:
  //   const signedTxns = await wallet.signTransactions(txns);
  //
  // For this example we sign locally with a mnemonic:
  const account = algosdk.mnemonicToSecretKey(MNEMONIC);
  const signedTxns = txns.map((txn) =>
    txn.signTxn(account.sk),
  );

  // 4. Submit
  const algod = client.algod;
  const { txid } = await algod.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(algod, txid, 4);
  console.log(`\nSwap confirmed: https://testnet.explorer.perawallet.app/tx/${txid}`);
}

main().catch(console.error);
