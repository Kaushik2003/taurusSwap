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
      <DialogContent className="max-w-sm rounded-[2rem] bg-white border-[3px] border-dark-green p-6 shadow-[-12px_12px_0_0_rgba(5,44,5,0.1)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-dark-green uppercase tracking-wider">
            Send Assets
          </DialogTitle>
        </DialogHeader>

        {status === "success" ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green/20 border-2 border-dark-green flex items-center justify-center mx-auto shadow-[-4px_4px_0_0_var(--color-dark-green)]">
              <span className="text-dark-green text-3xl font-black">✓</span>
            </div>
            <p className="text-lg font-black text-dark-green uppercase">Success!</p>
            <p className="text-xs text-dark-green/60 font-bold px-4">Your transaction has been confirmed on the Algorand blockchain.</p>
            <a
              href={`https://testnet.explorer.perawallet.app/tx/${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-dark-green underline font-black block"
            >
              View on Pera Explorer ↗
            </a>
            <Button variant="neo" className="w-full mt-2" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Token selector */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-dark-green/40 mb-2 ml-1">Select Token</p>
              <div className="relative">
                <button
                  onClick={() => setShowTokenPicker((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 bg-[#f8f9fa] border-2 border-dark-green rounded-2xl px-4 py-3.5 text-sm font-black text-dark-green hover:bg-[#e9ecef] transition-all shadow-[-4px_4px_0_0_rgba(0,0,0,0.05)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-[10px] shrink-0 border border-black/10"
                      style={{ background: asset?.color ?? "#888" }}
                    >
                      {asset?.symbol.slice(0, 2)}
                    </div>
                    <div className="text-left">
                      <p className="uppercase">{asset?.symbol}</p>
                      <p className="text-[10px] text-dark-green/40">
                        {asset?.balance.toLocaleString("en-US", {
                          maximumFractionDigits: 4,
                        })}{" "}
                        Available
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-dark-green" strokeWidth={3} />
                </button>

                {showTokenPicker && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-dark-green rounded-2xl overflow-hidden z-50 shadow-[-8px_8px_0_0_rgba(5,44,5,0.1)]">
                    {assets.map((a, i) => (
                      <button
                        key={a.symbol}
                        onClick={() => {
                          setSelectedIdx(i);
                          setShowTokenPicker(false);
                          setAmount("");
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-green transition-colors ${
                          i === selectedIdx ? "bg-green/30" : ""
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[10px] shrink-0"
                          style={{ background: a.color }}
                        >
                          {a.symbol.slice(0, 2)}
                        </div>
                        <span className="font-black text-dark-green uppercase">
                          {a.symbol}
                        </span>
                        <span className="ml-auto text-[10px] font-bold text-dark-green/40">
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
              <p className="text-[10px] font-black uppercase tracking-widest text-dark-green/40 mb-2 ml-1">
                Recipient Address
              </p>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Algorand address (58 chars)"
                className="w-full bg-[#f8f9fa] border-2 border-dark-green rounded-2xl px-4 py-3.5 text-sm text-dark-green font-bold placeholder:text-dark-green/20 outline-none focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] transition-all"
              />
            </div>

            {/* Amount */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-dark-green/40 mb-2 ml-1">Amount</p>
              <div className="flex gap-3">
                <input
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="0.00"
                  className="flex-1 bg-[#f8f9fa] border-2 border-dark-green rounded-2xl px-4 py-3.5 text-sm text-dark-green font-bold placeholder:text-dark-green/20 outline-none focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] transition-all"
                />
                <button
                  onClick={handleMax}
                  className="px-5 py-3 rounded-2xl bg-dark-green text-[#89f589] text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[-3px_3px_0_0_rgba(0,0,0,0.1)] active:scale-95"
                >
                  Max
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400">{errorMsg}</p>
            )}

            <Button
              variant="neo"
              className="w-full h-14 text-sm"
              onClick={handleSend}
              disabled={
                status === "submitting" || !recipient || !amount || !asset
              }
            >
              {status === "submitting" ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {status === "submitting" ? "Sending…" : `Send ${asset?.symbol ?? ""}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
