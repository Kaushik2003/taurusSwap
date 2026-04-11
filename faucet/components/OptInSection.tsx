'use client';

import { useState } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';
import { FAUCET_TOKENS } from '@/lib/tokens';
import { useOptInStatus, useRefreshOptIn } from '@/hooks/useOptInStatus';
import { CheckCircle, Loader } from './icons';

const ALGOD_SERVER =
  process.env.NEXT_PUBLIC_ALGOD_SERVER ?? 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = Number(process.env.NEXT_PUBLIC_ALGOD_PORT ?? 443);
const ALGOD_TOKEN = process.env.NEXT_PUBLIC_ALGOD_TOKEN ?? '';

function getAlgod() {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
}

export default function OptInSection() {
  const { activeAddress, signTransactions } = useWallet();
  const { data: optInStatus, isLoading } = useOptInStatus();
  const refresh = useRefreshOptIn();

  const [pending, setPending] = useState<number[]>([]); // assetIds currently being opted in
  const [error, setError] = useState<string | null>(null);

  if (!activeAddress) return null;

  const notOptedIn = FAUCET_TOKENS.filter(
    (t) => optInStatus && optInStatus[t.assetId] === false,
  );
  const allOptedIn = optInStatus && notOptedIn.length === 0 && !isLoading;

  async function optIn(assetIds: number[]) {
    if (!activeAddress || !signTransactions) return;
    setError(null);
    setPending(assetIds);

    try {
      const algod = getAlgod();
      const params = await algod.getTransactionParams().do();

      const txns = assetIds.map((assetId) =>
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: activeAddress,
          amount: 0,
          assetIndex: assetId,
          suggestedParams: params,
        }),
      );

      // Group if more than one transaction.
      if (txns.length > 1) algosdk.assignGroupID(txns);

      const encoded = txns.map((t) => t.toByte());
      const signed = (await signTransactions(encoded)).filter(
        (s): s is Uint8Array => s !== null,
      );
      await algod.sendRawTransaction(signed).do();

      // Wait for first txn to confirm (the rest land in the same block).
      await algosdk.waitForConfirmation(algod, txns[0].txID(), 10);

      // Refresh opt-in status from chain.
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('User cancelled') ? 'Transaction cancelled.' : `Opt-in failed: ${msg}`);
    } finally {
      setPending([]);
    }
  }

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-[var(--outline-variant)] pb-2">
        <p className="text-[10px] font-technical uppercase tracking-widest text-[var(--on-background)]/40">
          00 // Eligibility_Check
        </p>
        {!allOptedIn && notOptedIn.length > 1 && (
          <button
            onClick={() => optIn(notOptedIn.map((t) => t.assetId))}
            disabled={pending.length > 0 || isLoading}
            className="text-[10px] font-technical uppercase tracking-widest text-[var(--secondary)] hover:text-[var(--on-background)] transition-colors disabled:opacity-20"
          >
            {pending.length > 0 ? 'Syncing...' : `[ Opt_In_All (${notOptedIn.length}) ]`}
          </button>
        )}
      </div>

      {/* Token grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {isLoading
          ? FAUCET_TOKENS.map((t) => (
              <div key={t.assetId} className="h-14 bg-[var(--surface-container-low)] animate-pulse border-l-2 border-[var(--outline-variant)]" />
            ))
          : FAUCET_TOKENS.map((token) => {
              const isOptedIn = optInStatus?.[token.assetId] === true;
              const isPending = pending.includes(token.assetId);

              return (
                <div
                  key={token.assetId}
                  className={`flex items-center gap-4 px-4 py-3 border-l-2 transition-all ${
                    isOptedIn
                      ? 'bg-[var(--secondary)]/5 border-[var(--secondary)]'
                      : 'bg-[var(--surface-container-low)] border-[var(--outline-variant)]'
                  }`}
                >
                  {/* Symbol Swatch */}
                  <div 
                    className="w-10 h-10 flex items-center justify-center shrink-0 bg-[var(--background)] border border-[var(--outline-variant)]"
                  >
                    <span
                      className="w-4 h-4"
                      style={{ background: token.color }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold leading-none ${isOptedIn ? 'text-[var(--on-background)]' : 'text-[var(--on-background)]/60'}`}>
                      {token.symbol}
                    </p>
                    <p className="text-[9px] font-mono text-[var(--on-background)]/20 mt-1 uppercase tracking-tighter">ID::{token.assetId}</p>
                  </div>

                  {/* Status / action */}
                  {isOptedIn ? (
                    <div className="flex items-center gap-1.5 text-[9px] font-technical uppercase tracking-widest text-[var(--secondary)]">
                      <CheckCircle className="w-3 h-3" />
                      Ready
                    </div>
                  ) : isPending ? (
                    <div className="flex items-center gap-1.5 text-[9px] font-technical uppercase tracking-widest text-[var(--on-background)]/40 animate-pulse">
                      <Loader className="w-3 h-3 animate-spin" />
                      Syncing
                    </div>
                  ) : (
                    <button
                      onClick={() => optIn([token.assetId])}
                      disabled={pending.length > 0}
                      className="px-3 py-2 bg-[var(--background)] text-[10px] font-technical uppercase tracking-widest border border-[var(--outline-variant)] text-[var(--on-background)]/60 hover:text-[var(--secondary)] hover:border-[var(--secondary)] transition-all disabled:opacity-20"
                    >
                      Opt_In
                    </button>
                  )}
                </div>
              );
            })}
      </div>

      {/* Verification Banner */}
      {allOptedIn && (
        <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-[var(--secondary)]/10 border-l-2 border-[var(--secondary)]">
          <CheckCircle className="w-4 h-4 text-[var(--secondary)] shrink-0" />
          <p className="text-[10px] font-technical uppercase tracking-widest text-[var(--secondary)]">
            Status: All_Systems_Operational // Identity_Verified
          </p>
        </div>
      )}

      {/* Terminal Errors */}
      {error && (
        <div className="mt-4 px-4 py-3 bg-[var(--error)]/10 border-l-2 border-[var(--error)]">
          <p className="text-[10px] font-technical uppercase tracking-widest text-[var(--error)]">
            Fault: {error}
          </p>
        </div>
      )}
    </div>
  );
}
