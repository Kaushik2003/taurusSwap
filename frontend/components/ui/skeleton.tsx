import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/40 relative overflow-hidden",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-panel p-6 border-border/50 bg-muted/5 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-2 h-4 rounded-full bg-primary/40" />
        <Skeleton className="w-24 h-3" />
      </div>
      <div className="space-y-3 pt-2">
        <Skeleton className="w-full h-12 rounded-xl" />
        <Skeleton className="w-full h-12 rounded-xl" />
        <Skeleton className="w-3/4 h-8 rounded-xl" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="glass-panel border-border/50 overflow-hidden">
      <div className="p-4 border-b border-border/40 bg-muted/10">
        <Skeleton className="w-32 h-4" />
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="w-24 h-3" />
                <Skeleton className="w-16 h-2" />
              </div>
            </div>
            <Skeleton className="w-20 h-6 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
