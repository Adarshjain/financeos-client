'use client';

import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { AttentionItem } from '@/features/settings/connections/attentionItem.helpers';
import type { Schemas } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import { AssignAccountDialog } from './AssignAccountDialog';
import { AttentionItemRow } from './AttentionItemRow';

// The spec's status enum on GmailAttentionItemResponse is the ledger's full
// lifecycle (DISCOVERED, PROCESSING, CREATED, RECONCILED, SKIPPED_*, ...),
// wider than the 3 statuses the /gmail/attention endpoint actually returns.
// describeAttentionItem's fallback branch covers every value outside the two
// account cases, so this is safe without narrowing.
type PagedGmailAttention = Schemas['PageGmailAttentionItemResponse'];

/** Anchor id of the card; the attention push deep-links to `/settings/gmail?focus=attention`. */
export const ATTENTION_ANCHOR = 'attention';

interface GmailAttentionCardProps {
  attentionData: PagedGmailAttention;
  attentionPage: number;
  onPageChange: (page: number) => void;
  onRetry: (ledgerId: string) => void;
  /** Archived items (own pager); the card still renders when only these exist. */
  archivedData?: PagedGmailAttention | null;
  archivedPage?: number;
  onArchivedPageChange?: (page: number) => void;
  onArchive?: (ledgerId: string) => void;
  onUnarchive?: (ledgerId: string) => void;
  /**
   * True when the page was opened from the "needs attention" push: open the card (it is collapsed
   * by default) and scroll it into view.
   */
  autoScroll?: boolean;
}

function AttentionPager({
  data,
  page,
  onPageChange,
}: {
  data: PagedGmailAttention;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (data.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between py-2 border-t border-amber-100 dark:border-amber-900/30 text-2xs text-amber-800 dark:text-amber-300">
      <span>
        Page {data.number + 1} of {data.totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Previous page"
          disabled={data.number === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Next page"
          disabled={data.number >= data.totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

const noop = () => {};

export function GmailAttentionCard({
  attentionData,
  attentionPage,
  onPageChange,
  onRetry,
  archivedData = null,
  archivedPage = 0,
  onArchivedPageChange = noop,
  onArchive = noop,
  onUnarchive = noop,
  autoScroll = false,
}: GmailAttentionCardProps) {
  const [assigningItem, setAssigningItem] = useState<AttentionItem | null>(null);
  const [open, setOpen] = useState(autoScroll);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const bodyId = useId();
  const archivedId = useId();

  const activeCount = attentionData?.totalElements ?? 0;
  const archivedCount = archivedData?.totalElements ?? 0;
  const hasActive = Boolean(attentionData && attentionData.content.length > 0);
  const hasArchived = Boolean(archivedData && archivedData.content.length > 0);
  const hasItems = hasActive || hasArchived;

  // The "needs attention" push deep-links to /settings/gmail?focus=attention; the page passes
  // that down because the card renders only once the data is in, after any native scroll. The
  // card starts open in that case (see `open`'s initial state).
  useEffect(() => {
    if (!hasItems || !autoScroll) return;
    cardRef.current?.scrollIntoView({ block: 'start' });
  }, [hasItems, autoScroll]);

  if (!hasItems) return null;

  const rowHandlers = { onRetry, onAssign: setAssigningItem, onArchive, onUnarchive };

  return (
    <>
      <Card
        ref={cardRef}
        id={ATTENTION_ANCHOR}
        className="scroll-mt-4 border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10"
      >
        <CardHeader className={cn('p-0 border-amber-200 dark:border-amber-900/50', !open && 'border-b-0')}>
          <Button
            variant="ghost"
            className="h-auto w-full justify-between rounded-xl px-4 py-3"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Needs Attention ({activeCount})
            </span>
            <ChevronDown className={cn('h-4 w-4 text-amber-700 dark:text-amber-400 transition-transform', open && 'rotate-180')} />
          </Button>
        </CardHeader>

        {open && (
          <CardContent id={bodyId} className="px-4 py-2">
            {hasActive ? (
              <>
                <ul className="divide-y divide-amber-100 dark:divide-amber-900/30">
                  {attentionData.content.map((item) => (
                    <AttentionItemRow key={item.id} item={item} {...rowHandlers} />
                  ))}
                </ul>
                <AttentionPager data={attentionData} page={attentionPage} onPageChange={onPageChange} />
              </>
            ) : (
              <p className="py-3 text-xs text-slate-500 dark:text-slate-400">Nothing needs attention right now.</p>
            )}

            {hasArchived && archivedData && (
              <div className="border-t border-amber-100 dark:border-amber-900/30">
                <Button
                  variant="ghost"
                  size="sm"
                  className="my-1 w-full justify-between px-0"
                  aria-expanded={archivedOpen}
                  aria-controls={archivedId}
                  onClick={() => setArchivedOpen((v) => !v)}
                >
                  Archived ({archivedCount})
                  <ChevronDown className={cn('h-4 w-4 transition-transform', archivedOpen && 'rotate-180')} />
                </Button>
                {archivedOpen && (
                  <div id={archivedId}>
                    <ul className="divide-y divide-amber-100 dark:divide-amber-900/30">
                      {archivedData.content.map((item) => (
                        <AttentionItemRow key={item.id} item={item} {...rowHandlers} />
                      ))}
                    </ul>
                    <AttentionPager data={archivedData} page={archivedPage} onPageChange={onArchivedPageChange} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <AssignAccountDialog
        open={Boolean(assigningItem)}
        onOpenChange={(o) => {
          if (!o) setAssigningItem(null);
        }}
        item={assigningItem}
      />
    </>
  );
}
