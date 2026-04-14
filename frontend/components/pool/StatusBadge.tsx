import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: 'active' | 'near' | 'out';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    near: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
    out: 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
  };

  const labels = {
    active: 'Active',
    near: 'Near Range',
    out: 'Out of Range',
  };

  return (
    <Badge 
      variant="outline" 
      className={`${styles[status]} transition-all duration-300 font-bold px-2.5 py-0.5 rounded-md border text-[11px] uppercase tracking-wider`}
    >
      {labels[status]}
    </Badge>
  );
}
