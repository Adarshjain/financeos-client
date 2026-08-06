import { Skeleton } from '@/components/ui/skeleton';

export default function AccountsLoading() {
  return (
    <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, colIdx) => (
          <div key={colIdx} className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
