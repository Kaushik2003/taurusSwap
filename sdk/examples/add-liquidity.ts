/**
 * Example: add a concentrated-liquidity position with a $0.99 depeg boundary.
 *
 * Run with:  npx tsx examples/add-liquidity.ts
 */
import algosdk from "algosdk";
import { TaurusClient } from "../src/index";

const SENDER = "YOUR_ALGORAND_ADDRESS";
const MNEMONIC = "your twenty five word mnemonic phrase ...";

// How tight a peg boundary you want. 0.99 = tick activates when any token drops below $0.99.
const DEPEG_PRICE = 0.99;
// How much you want to deposit per token (100 USDC per token = 100 × 10^6 microunits)
const DEPOSIT_PER_TOKEN = 100_000_000n;

async function main() {
  const client = new TaurusClient();

  // 1. Compute tick parameters from your desired depeg price
  const { r, k } = await client.tickParamsFromDepegPrice(
    DEPEG_PRICE,
    DEPOSIT_PER_TOKEN,
  );
  console.log(`Tick params: r=${r}, k=${k}`);

  // Preview efficiency
  const pool = await client.getPoolState();
  const { efficiency, depositPerToken } = await client.getCapitalEfficiency(DEPEG_PRICE, r);
  console.log(`Capital efficiency: ${efficiency.toFixed(2)}×`);
  console.log(`Actual deposit per token: ${Number(depositPerToken) / 1e6} USDC`);

  // 2. Build add-liquidity transactions
  const { txns, depositPerTokenRaw, tickId } = await client.buildAddLiquidityTxns({
    sender: SENDER,
    r,
    k,
  });
  console.log(`\nBuilding add_tick group: ${txns.length} txn(s)`);
  console.log(`Will deposit ${Number(depositPerTokenRaw) / 1e6} per token, tick #${tickId}`);

  // 3. Sign and submit
  const account = algosdk.mnemonicToSecretKey(MNEMONIC);
  const signedTxns = txns.map((txn) => txn.signTxn(account.sk));
  const { txid } = await client.algod.sendRawTransaction(signedTxns).do();
  await algosdk.waitForConfirmation(client.algod, txid, 4);
  console.log(`\nLiquidity added: https://testnet.explorer.perawallet.app/tx/${txid}`);
}

main().catch(console.error);
