'use client';

/**
 * Shown when the API returns a "not opted in" error.
 * Explains what ASA opt-in means and links to docs.
 */
export default function OptInBanner({ assetId, symbol }: { assetId: number; symbol: string }) {
  return (
    <div className="mt-6 px-6 py-5 bg-[#FFE169]/10 border-2 border-[#FFE169] rounded-3xl shadow-[-4px_4px_0_0_#FFE169] animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 bg-[#FFE169] rounded-full animate-pulse" />
        <p className="text-[11px] font-black uppercase tracking-widest text-dark-green">
          Handshake Required: {symbol}
        </p>
      </div>
      <p className="text-xs font-bold text-dark-green/70 leading-relaxed">
        To maintain protocol integrity, your wallet must explicitly opt in to asset <span className="font-mono bg-white px-2 py-0.5 rounded border border-dark-green/10">#{assetId}</span> before requisition can proceed.
      </p>
      <div className="mt-4 flex items-center justify-between">
        <a
          href="https://developer.algorand.org/docs/get-details/asa/#receiving-an-asset"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-black uppercase tracking-widest text-dark-green hover:underline decoration-2 underline-offset-4"
        >
          Protocol Documentation ↗
        </a>
      </div>
    </div>

  );
}
