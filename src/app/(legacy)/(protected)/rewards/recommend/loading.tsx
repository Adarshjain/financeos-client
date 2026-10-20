import { Skeleton } from '@/components/ui/skeleton';

export default function RewardRecommendLoading() {
  return (
    <div className="p-4 sm:p-6 pb-24 space-y-6 max-w-7xl mx-auto">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <Skeleton className="h-[450px] w-full rounded-xl" />
        </div>
        <div className="lg:col-span-8 space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
