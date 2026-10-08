import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-4 pb-24 space-y-3 max-w-3xl mx-auto">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-60 w-full rounded-2xl" />
    </div>
  );
}
