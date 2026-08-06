import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-6 p-4 max-w-4xl">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}
