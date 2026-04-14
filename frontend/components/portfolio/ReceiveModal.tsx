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
      <DialogContent className="max-w-sm rounded-3xl bg-[hsl(240_8%_8%)] border border-border/30 p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-base font-semibold text-foreground">
            Receive crypto
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Fund your wallet by transferring from another wallet or account
          </p>
        </DialogHeader>

        {/* Address row */}
        <div className="flex items-center justify-between bg-muted/30 rounded-2xl px-4 py-2.5 mt-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Algorand address</p>
            <p className="text-sm font-mono font-semibold text-foreground truncate max-w-[200px]">
              {address.slice(0, 8)}…{address.slice(-6)}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="ml-3 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-primary" />
            ) : (
              <Copy className="w-4 h-4 text-primary" />
            )}
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center mt-4">
          <div className="bg-white rounded-2xl p-4 inline-block">
            <QRCodeSVG
              value={address}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Scan to receive tokens on Algorand testnet
          </p>
        </div>

        {/* Full address */}
        <div className="bg-muted/20 rounded-xl px-3 py-2 mt-2">
          <p className="text-[10px] text-muted-foreground mb-0.5">Full address</p>
          <p className="text-xs font-mono text-foreground break-all">{address}</p>
        </div>

        <button
          onClick={handleCopy}
          className="w-full mt-3 py-2.5 rounded-2xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
        >
          {copied ? "Copied!" : "Copy address"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
