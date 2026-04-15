import { useState } from 'react';
import algosdk from 'algosdk';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@txnlab/use-wallet-react';
import { claimFees, removeLiquidity, TickState } from '@/lib/orbital-sdk';
import type { PositionInfo, PoolState } from '@/lib/orbital-sdk';
import { useAlgodClient, POOL_APP_ID } from '@/hooks/useAlgodClient';
import { rawToDisplay, getTokenSymbol, getTokenIcon } from '@/lib/tokenDisplay';
import { Button } from '@/components/ui/button';

interface PositionCardProps {
  position: PositionInfo;
  pool: PoolState;
}

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

export function PositionCard({ position, pool }: PositionCardProps) {
  const algod = useAlgodClient();
  const queryClient = useQueryClient();
  const { activeAddress, signTransactions } = useWallet();

  const [claimStatus, setClaimStatus] = useState<ActionStatus>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimTxId, setClaimTxId] = useState<string | null>(null);

  const [removeStatus, setRemoveStatus] = useState<ActionStatus>('idle');
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeTxId, setRemoveTxId] = useState<string | null>(null);

  const tick = pool.ticks.find(t => t.id === position.tickId);
  const totalClaimable = position.claimableFees.reduce((a, b) => a + b, 0n);
  const isInterior = tick?.state === TickState.INTERIOR;

  const signer = async (txns: algosdk.Transaction[]) => {
    const encoded = txns.map(t => algosdk.encodeUnsignedTransaction(t));
    return signTransactions!(encoded);
  };

  const handleClaim = async () => {
    if (!activeAddress || !signTransactions) return;
    setClaimStatus('loading');
    setClaimError(null);
    try {
      const { txId } = await claimFees({
        client: algod,
        poolAppId: POOL_APP_ID,
        sender: activeAddress,
        tickId: position.tickId,
        signer: signer as any,
      });
      setClaimTxId(txId);
      setClaimStatus('success');
      queryClient.invalidateQueries({ queryKey: ['allPositions'] });
      queryClient.invalidateQueries({ queryKey: ['poolState'] });
    } catch (e: unknown) {
      setClaimError(e instanceof Error ? e.message : 'Claim failed');
      setClaimStatus('error');
    }
  };

  const handleRemove = async () => {
    if (!activeAddress || !signTransactions) return;
    setRemoveStatus('loading');
    setRemoveError(null);
    try {
      const { txId } = await removeLiquidity({
        client: algod,
        poolAppId: POOL_APP_ID,
        sender: activeAddress,
        tickId: position.tickId,
        shares: position.shares,
        signer: signer as any,
      });
      setRemoveTxId(txId);
      setRemoveStatus('success');
      queryClient.invalidateQueries({ queryKey: ['allPositions'] });
      queryClient.invalidateQueries({ queryKey: ['poolState'] });
    } catch (e: unknown) {
      setRemoveError(e instanceof Error ? e.message : 'Remove failed');
      setRemoveStatus('error');
    }
  };

  return (
    <div className="glass-panel-hover p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {Array.from({ length: pool.n }, (_, i) => (
              <img
                key={i}
                src={getTokenIcon(i)}
                alt={getTokenSymbol(pool, i)}
                className="w-7 h-7 rounded-full border-2 border-background object-cover bg-white"
              />
            ))}
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">
              {Array.from({ length: pool.n }, (_, i) => getTokenSymbol(pool, i)).join('/')}
            </span>
            <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              Tick #{position.tickId}
            </span>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${isInterior ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
          {isInterior ? 'INTERIOR' : 'BOUNDARY'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">Your shares</p>
          <p className="text-foreground font-medium">{position.shares.toString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">Position r</p>
          <p className="text-foreground font-medium">{rawToDisplay(position.positionR * 1000n)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-0.5">Claimable fees</p>
          <p className="text-foreground font-medium">{rawToDisplay(totalClaimable)}</p>
        </div>
      </div>

      {/* Per-token fee breakdown */}
      {position.claimableFees.some(f => f > 0n) && (
        <div className="mt-2 text-xs text-muted-foreground">
          {position.claimableFees.map((fee, i) =>
            fee > 0n ? (
              <span key={i} className="mr-3">
                {getTokenSymbol(pool, i)}: {rawToDisplay(fee)}
              </span>
            ) : null
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          className="rounded-2xl border-border"
          onClick={handleClaim}
          disabled={totalClaimable === 0n || claimStatus === 'loading' || claimStatus === 'success'}
        >
          {claimStatus === 'loading' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          {claimStatus === 'success' ? 'Claimed!' : 'Claim Fees'}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="rounded-2xl"
          onClick={handleRemove}
          disabled={removeStatus === 'loading' || removeStatus === 'success'}
        >
          {removeStatus === 'loading' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
          {removeStatus === 'success' ? 'Removed' : 'Remove'}
        </Button>
      </div>

      {/* Inline status messages */}
      {claimStatus === 'success' && claimTxId && (
        <p className="text-xs text-success mt-2 text-right">TX: {claimTxId.slice(0, 12)}…</p>
      )}
      {claimStatus === 'error' && claimError && (
        <p className="text-xs text-destructive mt-2 break-all">{claimError}</p>
      )}
      {removeStatus === 'success' && removeTxId && (
        <p className="text-xs text-success mt-2 text-right">Removed. TX: {removeTxId.slice(0, 12)}…</p>
      )}
      {removeStatus === 'error' && removeError && (
        <p className="text-xs text-destructive mt-2 break-all">{removeError}</p>
      )}
    </div>
  );
}
