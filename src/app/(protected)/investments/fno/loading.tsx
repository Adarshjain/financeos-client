import { Skeleton } from '@/components/ui/skeleton';

export default function FnoLoading() {
  return (
    <div className="p-4 sm:p-6 pb-24 space-y-2 max-w-5xl mx-auto">
      <div className="space-y-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Skeleton className="h-56 w-full rounded-2xl" />
    </div>
  );
}
