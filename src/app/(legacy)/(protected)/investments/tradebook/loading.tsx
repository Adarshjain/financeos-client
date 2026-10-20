import { Skeleton } from '@/components/ui/skeleton';

export default function TradebookLoading() {
  return (
    <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
