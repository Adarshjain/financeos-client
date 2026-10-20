import { Skeleton } from '@/components/ui/skeleton';

export default function InvestmentsOverviewLoading() {
  return (
    <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>

      {/* Allocation Chart Skeleton */}
      <Skeleton className="h-72 w-full rounded-2xl" />

      {/* Table Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}
