import { Skeleton } from '@/components/ui/skeleton';

export default function DividendsLoading() {
  return (
    <div className="pb-20 p-3 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="space-y-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
