'use client';

import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface RulesSelectionBarProps {
  pageSelectableIds: string[];
  selectedIds: string[];
  approving: boolean;
  onSelectPage: (checked: boolean | 'indeterminate', pageIds: string[]) => void;
  onApprove: () => void;
}

/** Select-all for the page's unverified rules, plus bulk approve once something is selected. */
export function RulesSelectionBar({
  pageSelectableIds,
  selectedIds,
  approving,
  onSelectPage,
  onApprove,
}: RulesSelectionBarProps) {
  if (pageSelectableIds.length === 0 && selectedIds.length === 0) return null;

  const isAllPageSelected =
    pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.includes(id));
  const isSomePageSelected = pageSelectableIds.some((id) => selectedIds.includes(id));

  return (
    <div className="flex items-center justify-between gap-3 px-3 min-h-8">
      <div className="flex items-center gap-3">
        <Checkbox
          id="select-all-rules-page"
          checked={isAllPageSelected ? true : isSomePageSelected ? 'indeterminate' : false}
          disabled={pageSelectableIds.length === 0}
          onCheckedChange={(checked) => onSelectPage(checked, pageSelectableIds)}
        />
        <label
          htmlFor="select-all-rules-page"
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
        >
          Select All Unverified on Page
        </label>
      </div>
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 animate-in fade-in duration-200">
          <span className="text-xs font-semibold whitespace-nowrap text-slate-800 dark:text-slate-200">
            {selectedIds.length} selected
          </span>
          <Button variant="emerald" size="sm" disabled={approving} onClick={onApprove}>
            <Check className="h-3.5 w-3.5" />
            <span>{approving ? 'Approving...' : 'Approve'}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
