import { Skeleton } from '@/components/ui/skeleton';

export default function DebugLoading() {
  return (
    <div className="space-y-4 p-4 max-w-5xl">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
