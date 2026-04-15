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

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
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
    <div className="mb-14">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-2">
        <p className="text-xs font-black uppercase tracking-widest text-dark-green/60">
          Available Assets
        </p>
        {!allOptedIn && notOptedIn.length > 1 && (
          <button
            onClick={() => optIn(notOptedIn.map((t) => t.assetId))}
            disabled={pending.length > 0 || isLoading}
            className="text-[11px] font-black uppercase tracking-widest text-dark-green hover:underline underline-offset-4 decoration-2 transition-all disabled:opacity-20"
          >
            {pending.length > 0 ? 'Syncing...' : `Opt In All (${notOptedIn.length})`}
          </button>
        )}
      </div>

      {/* Token grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-green/10 rounded-2xl animate-pulse" />
            ))
          : FAUCET_TOKENS.map((token) => {
              const isOptedIn = optInStatus?.[token.assetId] === true;
              const isPending = pending.includes(token.assetId);

              return (
                <div
                  key={token.assetId}
                  className={cn(
                    "relative flex items-center gap-4 px-5 py-4 rounded-3xl border-2 transition-all",
                    isOptedIn
                      ? 'bg-white border-dark-green shadow-[-4px_4px_0_0_var(--dark-green)]'
                      : 'bg-green/5 border-dark-green/10 opacity-70'
                  )}
                >
                  {/* Symbol Swatch */}
                  <div 
                    className="w-12 h-12 flex items-center justify-center shrink-0 rounded-2xl border-2 border-dark-green/10 bg-white"
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-dark-green/20"
                      style={{ background: token.color }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-dark-green uppercase">
                      {token.symbol}
                    </p>
                    <p className="text-[10px] font-black text-dark-green/30 uppercase tracking-widest mt-0.5">#{token.assetId}</p>
                  </div>

                  {/* Status / action */}
                  {isOptedIn ? (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-100/50 px-3 py-1.5 rounded-full border border-green-200">
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </div>
                  ) : isPending ? (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-dark-green/40 animate-pulse px-3 py-1.5 rounded-full border border-dark-green/10">
                      <Loader className="w-3 h-3 animate-spin" />
                      Syncing
                    </div>
                  ) : (
                    <button
                      onClick={() => optIn([token.assetId])}
                      disabled={pending.length > 0}
                      className="px-4 py-2 bg-[#FCA5F1] text-[11px] font-black uppercase tracking-widest border-2 border-dark-green text-dark-green rounded-full shadow-[-2px_2px_0_0_var(--dark-green)] hover:translate-y-[1px] hover:translate-x-[-1px] hover:shadow-[-1px_1px_0_0_var(--dark-green)] transition-all disabled:opacity-20 active:scale-95"
                    >
                      Opt In
                    </button>
                  )}
                </div>
              );
            })}
      </div>

      {/* Verification Banner */}
      {allOptedIn && (
        <div className="mt-6 flex items-center gap-3 px-5 py-4 bg-white rounded-3xl border-2 border-dark-green shadow-[-4px_4px_0_0_var(--dark-green)] animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center border border-green-200 shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-dark-green">
              Status: Verified Client
            </p>
            <p className="text-[9px] font-bold text-dark-green/40 uppercase tracking-widest mt-0.5">
              All selected assets are opted-in and ready for requisition.
            </p>
          </div>
        </div>
      )}

      {/* Terminal Errors */}
      {error && (
        <div className="mt-6 px-5 py-4 bg-red-50 rounded-3xl border-2 border-red-500 shadow-[-4px_4px_0_0_rgba(239,68,68,1)]">
          <p className="text-[11px] font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            Error: {error}
          </p>
        </div>
      )}
    </div>

  );
}
