import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Smartphone, ShieldCheck, ArrowRight } from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean;
  step: string | null;
  details?: string | null;
  address: string | null;
}

export function TransactionModal({ isOpen, step, details, address }: TransactionModalProps) {
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[420px] glass-panel border-white/10 bg-black/80 backdrop-blur-2xl p-0 overflow-hidden outline-none">
        <div className="relative p-8 flex flex-col items-center text-center">
          {/* Background Highlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 blur-[100px] -z-10 rounded-full" />
          
          <div className="mb-6 relative mt-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center relative">
              <Smartphone className="w-10 h-10 text-primary animate-bounce" />
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border border-border shadow-xl flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>

          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-black text-foreground tracking-tighter">
              Signature Required
            </DialogTitle>
          </DialogHeader>
          
          <div className="mb-8 space-y-4">
             <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-[280px]">
              Please check your connected wallet on your <span className="text-foreground font-bold">phone</span> to authorize the transaction.
            </p>
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black font-mono text-primary uppercase tracking-wider">{shortAddress}</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/20 text-left flex items-center gap-4 transition-all">
              <div className="w-10 h-10 rounded-lg bg-background border border-border/40 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Current Action</p>
                <p className="text-xs font-bold text-foreground truncate mb-1">
                  {step || "Initializing..."}
                </p>
                {details && (
                  <p className="text-[11px] font-black text-primary tracking-tight">
                    {details}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/10 border-t border-border/40 p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            <span>Powered by Orbit Signer</span>
            <div className="flex items-center gap-1">
              <span>Testnet Security</span>
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
