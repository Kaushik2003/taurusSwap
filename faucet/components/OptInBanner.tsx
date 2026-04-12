'use client';

/**
 * Shown when the API returns a "not opted in" error.
 * Explains what ASA opt-in means and links to docs.
 */
export default function OptInBanner({ assetId, symbol }: { assetId: number; symbol: string }) {
  return (
    <div className="mt-4 px-4 py-4 rounded-2xl bg-amber-50 border border-amber-200 animate-slide-up">
      <p className="text-sm font-bold text-amber-800 mb-1">
        Opt-in required for {symbol}
      </p>
      <p className="text-xs text-amber-700 leading-relaxed">
        Algorand requires every wallet to explicitly opt in to each ASA before receiving it.
        Open your wallet app (Pera, Defly, or Exodus), search for asset{' '}
        <span className="font-mono font-bold">#{assetId}</span>, and tap{' '}
        <span className="font-bold">Add Asset</span>. Then come back and request tokens.
      </p>
      <a
        href="https://developer.algorand.org/docs/get-details/asa/#receiving-an-asset"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
      >
        What is an ASA opt-in? ↗
      </a>
    </div>
  );
}
