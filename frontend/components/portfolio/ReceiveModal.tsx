"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  address: string;
}

export default function ReceiveModal({ open, onClose, address }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-[2rem] bg-white border-[3px] border-dark-green p-6 shadow-[-12px_12px_0_0_rgba(5,44,5,0.1)]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-black text-dark-green uppercase tracking-wider">
            Receive Crypto
          </DialogTitle>
          <p className="text-xs font-bold text-dark-green/60 mt-1">
            Fund your wallet by transferring from another wallet or account
          </p>
        </DialogHeader>

        {/* Address row */}
        <div className="flex items-center justify-between bg-[#f8f9fa] border-2 border-dark-green rounded-2xl px-4 py-3 mt-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-dark-green/40 mb-0.5">Algorand address</p>
            <p className="text-sm font-mono font-bold text-dark-green truncate max-w-[200px]">
              {address.slice(0, 8)}…{address.slice(-6)}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="ml-3 w-10 h-10 rounded-xl bg-white border-2 border-dark-green flex items-center justify-center shrink-0 hover:bg-green hover:translate-y-[1px] hover:translate-x-[-1px] shadow-[-2px_2px_0_0_var(--color-dark-green)] hover:shadow-[-1px_1px_0_0_var(--color-dark-green)] transition-all"
          >
            {copied ? (
              <Check className="w-5 h-5 text-dark-green" strokeWidth={2.5} />
            ) : (
              <Copy className="w-5 h-5 text-dark-green" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center mt-6">
          <div className="bg-white rounded-3xl p-5 inline-block border-[3px] border-dark-green shadow-[-8px_8px_0_0_var(--color-dark-green)] hover:translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[-6px_6px_0_0_var(--color-dark-green)] transition-all">
            <QRCodeSVG
              value={address}
              size={180}
              bgColor="#ffffff"
              fgColor="#052c05"
              level="M"
            />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-dark-green/60 mt-5 text-center">
            Scan to receive tokens on Algorand testnet
          </p>
        </div>

        {/* Full address */}
        <div className="bg-[#f8f9fa] border-2 border-dark-green border-dashed rounded-xl px-4 py-3 mt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-dark-green/40 mb-1">Full address</p>
          <p className="text-xs font-mono font-bold text-dark-green break-all">{address}</p>
        </div>

        <Button
          onClick={handleCopy}
          variant="neo"
          className="w-full mt-6 h-14 text-sm"
        >
          {copied ? "Copied!" : "Copy Address"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
