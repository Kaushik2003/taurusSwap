import { getIndexerClient, getDispenserAccount } from './algorand';
import { getToken } from './tokens';

export interface FaucetTransaction {
  txId: string;
  assetId: number;
  symbol: string;
  amount: number;
  receiver: string;
  timestamp: number;
  confirmedRound: number;
}

/**
 * Fetches recent faucet transactions from the Algorand Indexer.
 * 
 * @param receiver Optional receiver address to filter transactions for a specific user.
 * @param limit Number of transactions to fetch (default 10).
 */
export async function getRecentTransactions(receiver?: string, limit = 10): Promise<FaucetTransaction[]> {
  const indexer = getIndexerClient();
  const dispenser = getDispenserAccount();

  try {
    let query = indexer
      .searchForTransactions()
      .address(dispenser.addr)
      .addressRole('sender')
      .txType('axfer')
      .limit(limit);

    if (receiver) {
      // If receiver is provided, we want transactions where the dispenser sent to this receiver.
      // Note: The indexer's .address() filter with 'sender' role is already set.
      // Adding another address filter for 'receiver' might be tricky with some Indexers, 
      // but we can filter the results manually if needed, or use .header-only(false).
      // Actually, Algorand Indexer supports multiple address filters.
    }

    const response = await query.do();
    const transactions = response.transactions || [];

    const formatted: FaucetTransaction[] = transactions
      .map((tx: any) => {
        const assetTransfer = tx['asset-transfer-transaction'];
        if (!assetTransfer) return null;

        const assetId = assetTransfer['asset-id'];
        const token = getToken(assetId);
        if (!token) return null; // Ignore non-faucet assets if any

        // Filter by receiver if requested (if indexer didn't handle it perfectly)
        const txReceiver = assetTransfer['receiver'];
        if (receiver && txReceiver !== receiver) return null;

        const rawAmount = assetTransfer['amount'];
        const amount = rawAmount / 10 ** token.decimals;

        return {
          txId: tx['id'],
          assetId,
          symbol: token.symbol,
          amount,
          receiver: txReceiver,
          timestamp: tx['round-time'],
          confirmedRound: tx['confirmed-round'],
        };
      })
      .filter((tx: any): tx is FaucetTransaction => tx !== null);

    return formatted;
  } catch (error) {
    console.error('[transactions] Error fetching from indexer:', error);
    return [];
  }
}
