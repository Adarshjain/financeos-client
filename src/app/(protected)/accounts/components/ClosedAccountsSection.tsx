import { ChevronRight } from 'lucide-react';

interface ClosedAccountsSectionProps<T extends { id: string }> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

export function ClosedAccountsSection<T extends { id: string }>({
  items,
  renderItem,
}: ClosedAccountsSectionProps<T>) {
  if (items.length === 0) return null;

  return (
    <details className="group/closedsec">
      <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center gap-1.5 py-1 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
        <ChevronRight className="w-3.5 h-3.5 transition-transform group-open/closedsec:rotate-90" />
        Closed ({items.length})
      </summary>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 mt-3">
        {items.map((item) => renderItem(item))}
      </div>
    </details>
  );
}
