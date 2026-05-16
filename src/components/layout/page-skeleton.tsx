export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-bg-muted rounded" />
      </div>
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-bg-muted rounded-xl" />
        ))}
      </div>
      {/* Content rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-48 bg-bg-muted rounded-xl"
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  );
}
