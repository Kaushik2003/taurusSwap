import React from 'react';
import { 
  X, 
  AlertCircle, 
  RefreshCcw, 
  HelpCircle 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: {
    title: string;
    message: string;
    action?: string;
  } | null;
  onRetry?: () => void;
}

export function ErrorModal({ isOpen, onClose, error, onRetry }: ErrorModalProps) {
  if (!error) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] glass-panel border-rose-500/20 bg-black/90 backdrop-blur-2xl p-0 overflow-hidden outline-none">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="mb-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center relative">
              <AlertCircle className="w-8 h-8 text-rose-500 animate-pulse" />
            </div>
          </div>

          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-foreground tracking-tight">
              {error.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mb-8">
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              {error.message}
            </p>
            
            {error.action && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-left flex gap-3">
                <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-muted-foreground leading-tight">
                  <span className="text-primary uppercase tracking-wider block mb-1">Recommendation</span>
                  {error.action}
                </p>
              </div>
            )}
          </div>

          <div className="w-full flex gap-3 mt-2">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl h-11 font-bold border-border/40 hover:bg-muted/20"
              onClick={onClose}
            >
              Close
            </Button>
            {onRetry && (
               <Button 
               className="flex-1 rounded-xl h-11 font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
               onClick={() => {
                 onClose();
                 onRetry();
               }}
             >
               <RefreshCcw className="w-4 h-4 mr-2" />
               Try Again
             </Button>
            )}
          </div>
        </div>

        <div className="bg-rose-500/5 border-t border-rose-500/10 p-4 text-center">
           <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-[0.2em]">Transaction Security Protection Active</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
