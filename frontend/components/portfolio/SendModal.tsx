"use client";

import { useState } from "react";
import algosdk from "algosdk";
import { useWallet } from "@txnlab/use-wallet-react";
import { Loader2, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAlgodConfigFromViteEnvironment } from "@/utils/network/getAlgoClientConfigs";
import type { WalletTokenAsset } from "@/hooks/useWalletAssets";

interface Props {
  open: boolean;
  onClose: () => void;
  assets: WalletTokenAsset[];
}

type Status = "idle" | "submitting" | "success" | "error";

export default function SendModal({ open, onClose, assets }: Props) {
  const { activeAddress, signTransactions } = useWallet();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [txId, setTxId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTokenPicker, setShowTokenPicker] = useState(false);

  const asset = assets[selectedIdx] ?? assets[0];

  function handleMax() {
    if (!asset) return;
    if (!asset.asaId) {
      // Leave a small buffer for fees when sending ALGO
      const maxAlgo = Math.max(0, asset.balance - 0.002);
      setAmount(maxAlgo.toFixed(6));
    } else {
      setAmount(asset.balance.toFixed(asset.decimals));
    }
  }

  async function handleSend() {
    if (!activeAddress || !asset) return;
    const cfg = getAlgodConfigFromViteEnvironment();
    const algod = new algosdk.Algodv2(cfg.token ?? "", cfg.server, cfg.port);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Enter a valid amount.");
      return;
    }
    if (!algosdk.isValidAddress(recipient)) {
      setErrorMsg("Enter a valid Algorand address.");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const params = await algod.getTransactionParams().do();
      let txn: algosdk.Transaction;

      if (!asset.asaId) {
        // ALGO payment
        const microAlgos = BigInt(Math.round(parsedAmount * 1_000_000));
        txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: recipient,
          amount: microAlgos,
          suggestedParams: params,
        });
      } else {
        // ASA transfer
        const rawAmount = BigInt(
          Math.round(parsedAmount * 10 ** asset.decimals)
        );
        txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: recipient,
          assetIndex: BigInt(asset.asaId),
          amount: rawAmount,
          suggestedParams: params,
        });
      }

      const encodedTxn = algosdk.encodeUnsignedTransaction(txn);
      const signed = await signTransactions([encodedTxn]);
      const signedTxn = signed[0];
      if (!signedTxn) throw new Error("Signing was cancelled.");
      const { txid } = await algod.sendRawTransaction(signedTxn).do();
      setTxId(txid);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Transaction failed.");
      setStatus("error");
    }
  }

  function handleClose() {
    setStatus("idle");
    setTxId(null);
    setErrorMsg(null);
    setRecipient("");
    setAmount("");
    setSelectedIdx(0);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm rounded-3xl bg-[hsl(240_8%_8%)] border border-border/30 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">
            Send
          </DialogTitle>
        </DialogHeader>

        {status === "success" ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <p className="text-sm text-foreground font-semibold">Sent successfully!</p>
            <a
              href={`https://testnet.explorer.perawallet.app/tx/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline block"
            >
              View on Pera Explorer ↗
            </a>
            <Button className="w-full mt-2" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Token selector */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Token</p>
              <div className="relative">
                <button
                  onClick={() => setShowTokenPicker((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 bg-muted/30 rounded-2xl px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                      style={{ background: asset?.color ?? "#888" }}
                    >
                      {asset?.symbol.slice(0, 2)}
                    </div>
                    <span>{asset?.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      {asset?.balance.toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })}{" "}
                      available
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {showTokenPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[hsl(240_8%_10%)] border border-border/30 rounded-2xl overflow-hidden z-50 shadow-xl">
                    {assets.map((a, i) => (
                      <button
                        key={a.symbol}
                        onClick={() => {
                          setSelectedIdx(i);
                          setShowTokenPicker(false);
                          setAmount("");
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/40 transition-colors ${
                          i === selectedIdx ? "bg-primary/10" : ""
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                          style={{ background: a.color }}
                        >
                          {a.symbol.slice(0, 2)}
                        </div>
                        <span className="font-medium text-foreground">
                          {a.symbol}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {a.balance.toLocaleString("en-US", {
                            maximumFractionDigits: 4,
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recipient */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                Recipient address
              </p>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Algorand address (58 chars)"
                className="w-full bg-muted/30 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            {/* Amount */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Amount</p>
              <div className="flex gap-2">
                <input
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="0.00"
                  className="flex-1 bg-muted/30 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleMax}
                  className="px-4 py-3 rounded-2xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400">{errorMsg}</p>
            )}

            <Button
              className="w-full"
              onClick={handleSend}
              disabled={
                status === "submitting" || !recipient || !amount || !asset
              }
            >
              {status === "submitting" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {status === "submitting" ? "Sending…" : `Send ${asset?.symbol ?? ""}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
