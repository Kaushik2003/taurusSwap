import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react';
import Account from './Account';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ConnectWalletInterface {
  openModal: boolean;
  closeModal: () => void;
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { wallets, activeAddress } = useWallet();
  console.log('ConnectWallet render - activeAddress:', activeAddress, 'wallets:', wallets?.map(w => ({ id: w.id, isActive: w.isActive })));

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD;

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (openModal) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [openModal, closeModal]);

  if (!openModal) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeModal}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-md glass-panel border border-border p-6 pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={closeModal}
            className="absolute right-4 top-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-6">Select wallet provider</h2>

          {/* Content */}
          <div className="flex flex-col gap-3">
            {activeAddress && (
              <>
                <Account />
                <div className="h-px bg-border my-2" />
              </>
            )}

            {!activeAddress &&
              wallets?.map((wallet) => (
                <Button
                  key={`provider-${wallet.id}`}
                  variant="outline"
                  className="flex items-center justify-start gap-3 h-14 w-full bg-secondary/50 hover:bg-secondary border-border/50"
                  onClick={async () => {
                    try {
                      // If the wallet is already connected, don't try to connect again
                      if (wallet.isConnected) {
                        await wallet.setActive();
                        closeModal();
                        return;
                      }

                      closeModal(); // Close our modal FIRST so Pera's modal isn't blocked
                      await wallet.connect();
                    } catch (e: any) {
                      console.error('Wallet connection failed:', e);
                      // If it's already connected, we can just set it as active
                      if (e?.message?.includes('Session currently connected')) {
                        await wallet.setActive();
                      }
                    }
                  }}
                >
                  {!isKmd(wallet) && (
                    <img
                      alt={`wallet_icon_${wallet.id}`}
                      src={wallet.metadata.icon}
                      className="w-6 h-6 object-contain"
                    />
                  )}
                  <span className="font-semibold text-base">
                    {isKmd(wallet) ? 'LocalNet Wallet' : wallet.metadata.name}
                  </span>
                </Button>
              ))}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={closeModal}>
              Close
            </Button>
            {activeAddress && (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (wallets) {
                    const activeWallet = wallets.find((w) => w.isActive);
                    if (activeWallet) {
                      await activeWallet.disconnect();
                    } else {
                      localStorage.removeItem('@txnlab/use-wallet:v3');
                      window.location.reload();
                    }
                  }
                  closeModal();
                }}
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConnectWallet;
