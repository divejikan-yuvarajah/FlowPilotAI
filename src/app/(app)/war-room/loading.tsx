import { Skeleton } from "@/components/ui/skeleton";

function StatCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-6 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-36" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-lg p-5 ${className}`}>
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export default function WarRoomLoading() {
  return (
    <div className="space-y-6 pb-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Row 1 — 4 stat tiles */}
      <div className="grid grid-cols-12 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="col-span-3">
            <StatCardSkeleton />
          </div>
        ))}
      </div>

      {/* Row 2 — AI brief + actions */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8">
          <CardSkeleton className="min-h-[280px]" />
        </div>
        <div className="col-span-4">
          <CardSkeleton className="min-h-[280px]" />
        </div>
      </div>

      {/* Row 3 — chart + overdue */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <CardSkeleton className="min-h-[320px]" />
        </div>
        <div className="col-span-5">
          <CardSkeleton className="min-h-[320px]" />
        </div>
      </div>

      {/* Row 4 — activity feed */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
            <Skeleton className="h-4 w-32" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
