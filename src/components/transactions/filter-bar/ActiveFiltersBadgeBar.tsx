'use client';

import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { RemovableBadge } from '@/components/ui/removable-badge';

interface ActiveFiltersBadgeBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  activeBadges: { key: string; label: string; onRemove: () => void }[];
  onClearAll: () => void;
}

export function ActiveFiltersBadgeBar({
  search,
  onSearchChange,
  activeBadges,
  onClearAll,
}: ActiveFiltersBadgeBarProps) {
  const hasActiveFilters = activeBadges.length > 0 || search.trim() !== '';

  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pb-0">
      <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
        <SlidersHorizontal className="h-3 w-3" />
        Active:
      </span>

      {search.trim() !== '' && (
        <RemovableBadge
          variant="secondary"
          label={`Search: "${search}"`}
          removeLabel="Clear search"
          onRemove={() => onSearchChange('')}
          className="h-6 gap-1 px-2.5 text-2xs font-medium rounded-full bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors touch-manipulation"
        />
      )}

      {activeBadges.map((badge) => (
        <RemovableBadge
          key={badge.key}
          variant="secondary"
          label={badge.label}
          onRemove={badge.onRemove}
          className="h-6 gap-1 px-2.5 text-2xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 dark:hover:border-rose-800 transition-colors touch-manipulation"
        />
      ))}

      <Button
        variant="ghost-destructive"
        size="micro"
        onClick={onClearAll}
        className="font-semibold rounded-full ml-auto touch-manipulation"
      >
        Clear all
      </Button>
    </div>
  );
}
