import { Skeleton } from '@/components/ui/skeleton';

export default function CorporateActionsLoading() {
  return (
    <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full">
      <div className="space-y-1 pb-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
