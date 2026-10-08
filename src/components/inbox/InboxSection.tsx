'use client';

import { Card } from '@/components/ui/card';
import type { InboxItemResponse } from '@/lib/api/types';

import { InboxItemRow } from './InboxItemRow';
import type { InboxRowHandlers } from './InboxRowActions';
import { InboxSummaryRow } from './InboxSummaryRow';

interface InboxSectionProps extends InboxRowHandlers {
  sectionKey: string;
  title: string;
  items: InboxItemResponse[];
  highlightKey: string | null;
}

/** One section ("Act now", "Needs a look", "Info"); the view hides it when empty. */
export function InboxSection({ sectionKey, title, items, highlightKey, ...handlers }: InboxSectionProps) {
  return (
    <section aria-labelledby={`inbox-section-${sectionKey}`} data-testid={`inbox-section-${sectionKey}`}>
      <h2
        id={`inbox-section-${sectionKey}`}
        className="mb-1.5 px-1 text-2xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400"
      >
        {title} <span className="font-semibold">({items.length})</span>
      </h2>
      <Card className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) =>
            item.rowType === 'summary' ? (
              <InboxSummaryRow key={item.key} item={item} highlighted={item.key === highlightKey} {...handlers} />
            ) : (
              <InboxItemRow key={item.key} item={item} highlighted={item.key === highlightKey} {...handlers} />
            ),
          )}
        </ul>
      </Card>
    </section>
  );
}
