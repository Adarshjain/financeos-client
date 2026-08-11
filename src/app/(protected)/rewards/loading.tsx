import { Skeleton } from '@/components/ui/skeleton';

export default function RewardsLoading() {
  return (
    <div className="p-4 sm:p-6 pb-24 space-y-4 max-w-7xl mx-auto">
      <Skeleton className="h-8 w-40" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-52 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}
