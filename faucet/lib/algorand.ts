/**
 * Server-side Algorand helpers for the faucet.
 *
 * All signing happens here — never on the client.
 * The dispenser mnemonic is read exclusively from environment variables.
 */

import algosdk from 'algosdk';

// ---------------------------------------------------------------------------
// Client singletons
// ---------------------------------------------------------------------------

let _algod: algosdk.Algodv2 | null = null;
let _indexer: algosdk.Indexer | null = null;

export function getAlgodClient(): algosdk.Algodv2 {
  if (_algod) return _algod;

  const server = process.env.ALGOD_SERVER;
  const token = process.env.ALGOD_TOKEN ?? '';
  const port = process.env.ALGOD_PORT ?? '';

  if (!server) {
    throw new Error('ALGOD_SERVER environment variable is not set.');
  }

  _algod = new algosdk.Algodv2(token, server, port);
  return _algod;
}

export function getIndexerClient(): algosdk.Indexer {
  if (_indexer) return _indexer;

  const server = process.env.INDEXER_SERVER || process.env.ALGOD_SERVER?.replace('-api.', '-idx.');
  const token = process.env.INDEXER_TOKEN ?? '';
  const port = process.env.INDEXER_PORT ?? '';

  if (!server) {
    throw new Error('INDEXER_SERVER environment variable is not set and could not be derived.');
  }

  _indexer = new algosdk.Indexer(token, server, port);
  return _indexer;
}

// ---------------------------------------------------------------------------
// Dispenser account
// ---------------------------------------------------------------------------

let _dispenser: algosdk.Account | null = null;

export function getDispenserAccount(): algosdk.Account {
  if (_dispenser) return _dispenser;

  const mnemonic = process.env.DISPENSER_MNEMONIC;
  if (!mnemonic) {
    throw new Error('DISPENSER_MNEMONIC environment variable is not set.');
  }

  _dispenser = algosdk.mnemonicToSecretKey(mnemonic);
  return _dispenser;
}

// ---------------------------------------------------------------------------
// Address validation
// ---------------------------------------------------------------------------

/** Returns true only for valid Algorand base-32 addresses (58 chars, valid checksum). */
export function isValidAddress(address: string): boolean {
  if (typeof address !== 'string' || address.length !== 58) return false;
  try {
    return algosdk.isValidAddress(address);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Opt-in check
// ---------------------------------------------------------------------------

/**
 * Returns true when the given account has opted into the asset.
 * Throws if the algod call itself fails (network error, etc.).
 */
export async function hasOptedIn(address: string, assetId: number): Promise<boolean> {
  const algod = getAlgodClient();
  try {
    await algod.accountAssetInformation(address, assetId).do();
    return true;
  } catch (err: unknown) {
    // algod returns HTTP 404 when the account hasn't opted in.
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return false;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Faucet balance
// ---------------------------------------------------------------------------

/**
 * Returns the dispenser's current balance (in base units) for the given asset.
 * Returns 0n if the dispenser hasn't opted in yet.
 */
export async function getDispenserBalance(assetId: number): Promise<bigint> {
  const algod = getAlgodClient();
  const dispenser = getDispenserAccount();
  try {
    const info = await algod.accountAssetInformation(dispenser.addr, assetId).do();
    return BigInt(info.assetHolding?.amount ?? 0);
  } catch {
    return BigInt(0);
  }
}

// ---------------------------------------------------------------------------
// Asset transfer (the actual faucet send)
// ---------------------------------------------------------------------------

/**
 * Sends `amountBaseUnits` of `assetId` from the dispenser to `recipient`.
 *
 * @returns The confirmed transaction ID.
 * @throws  If the recipient hasn't opted in, if the dispenser has insufficient
 *          funds, or if the network call fails.
 */
export async function sendAsset(
  recipient: string,
  assetId: number,
  amountBaseUnits: bigint,
): Promise<string> {
  const algod = getAlgodClient();
  const dispenser = getDispenserAccount();

  // Suggested params (fee, first/last valid rounds, genesis).
  const params = await algod.getTransactionParams().do();

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: dispenser.addr,
    receiver: recipient,
    assetIndex: assetId,
    amount: amountBaseUnits,
    suggestedParams: params,
  });

  const signedTxn = txn.signTxn(dispenser.sk);

  const { txid } = await algod.sendRawTransaction(signedTxn).do();

  // Wait up to 10 rounds for confirmation.
  await algosdk.waitForConfirmation(algod, txid, 10);

  return txid;
}
