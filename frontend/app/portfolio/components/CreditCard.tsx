import { motion } from "framer-motion";
import { Nfc, Circle } from "lucide-react";

interface CreditCardProps {
  balance: string;
  address: string;
  className?: string;
}

export default function CreditCard({ balance, address, className = "" }: CreditCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      // Standard credit card ratio is 1.586
      className={`relative w-full aspect-[1.586/1] rounded-2xl overflow-hidden p-6 flex flex-col justify-between text-white shadow-xl ${className}`}
      style={{
        background: "linear-gradient(135deg, hsl(137 65% 55%), hsl(145 60% 30%), hsl(160 50% 15%))", // Bright active green to dark green
        transformStyle: "preserve-3d",
      }}
    >
      {/* Decorative blurred background circles for glass/glow effect */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-black/30 blur-3xl rounded-full pointer-events-none" />

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "16px 16px" }}
      />

      {/* Card Header */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-3">
          {/* Mock Chip */}
          <div className="w-11 h-8 rounded-md bg-gradient-to-br from-yellow-200/80 to-amber-500/60 border border-yellow-100/40 flex items-center justify-center opacity-90 backdrop-blur-sm shadow-inner">
            <div className="w-[60%] h-[50%] border border-black/10 rounded-[2px]" />
          </div>
          <Nfc className="w-6 h-6 text-white/50 rotate-90" />
        </div>
        <div className="flex font-mono items-center italic tracking-wider font-extrabold text-xl text-white/90 drop-shadow">
          TAURUS
        </div>
      </div>

      {/* Card Body - Balance */}
      <div className="relative z-10 mt-auto mb-6">
        <p className="text-[11px] text-white/70 font-medium uppercase tracking-[0.2em] mb-1">
          Total Balance
        </p>
        <p className="text-4xl font-extrabold tracking-tight drop-shadow-md text-white">
          {balance}
        </p>
      </div>

      {/* Card Footer */}
      <div className="flex items-end justify-between relative z-10">
        <div>
          <p className="text-[10px] text-white/60 font-medium uppercase tracking-[0.2em] mb-1">
            Cardholder
          </p>
          <p className="text-sm font-mono tracking-widest text-white/95 drop-shadow-sm uppercase">
            {address || "UNKNOWN WALLET"}
          </p>
        </div>
        
        {/* Mock Network Logo */}
        <div className="flex items-center -space-x-4 opacity-90 pb-1">
          <Circle className="w-9 h-9 text-white/40 fill-white/40 mix-blend-screen" />
          <Circle className="w-9 h-9 text-white/60 fill-white/60 mix-blend-screen" />
        </div>
      </div>
    </motion.div>
  );
}
