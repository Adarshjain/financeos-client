import { Skeleton } from '@/components/ui/skeleton';

export default function RewardRulesLoading() {
  return (
    <div className="p-4 sm:p-6 pb-24 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-56 rounded-xl" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
