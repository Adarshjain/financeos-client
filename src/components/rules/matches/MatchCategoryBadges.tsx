import React from 'react';

import { Badge } from '@/components/ui/badge';
import type { RuleMatchTransaction } from '@/lib/rules.types';

/** A matched transaction's current categories, or "Uncategorized". */
export function MatchCategoryBadges({
  categories,
}: {
  categories: RuleMatchTransaction['categories'];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {categories.length === 0 ? (
        <span className="text-slate-400 italic">Uncategorized</span>
      ) : (
        categories.map((c) => (
          <Badge
            key={c.id}
            variant="outline"
            className="rounded-full px-2 py-0 text-2xs border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
          >
            {c.name}
          </Badge>
        ))
      )}
    </div>
  );
}
