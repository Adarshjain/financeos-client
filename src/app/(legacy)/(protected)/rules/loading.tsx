import { Skeleton } from '@/components/ui/skeleton';

export default function RulesLoading() {
  return (
    <div className="p-4 sm:p-6 pb-24 space-y-2 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
