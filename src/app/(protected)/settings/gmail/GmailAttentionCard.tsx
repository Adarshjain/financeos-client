'use client';

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  UserPlus,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Schemas } from '@/lib/api/types';

import { AssignAccountDialog } from './AssignAccountDialog';

// The spec's status enum on GmailAttentionItemResponse is the ledger's full
// lifecycle (DISCOVERED, PROCESSING, CREATED, RECONCILED, SKIPPED_*, ...),
// wider than the 4 statuses the /gmail/attention endpoint actually returns
// (the hand-written GmailAttentionItem in @/lib/types hand-narrows to those
// 4) — see "Spec follow-ups" in the migration report. The default branch
// below already covers every value outside the two named cases, so this is
// safe without narrowing.
type PagedGmailAttention = Schemas['PageGmailAttentionItemResponse'];
type AttentionItem = PagedGmailAttention['content'][number];

/** Anchor id of the card; the attention push deep-links to `/settings/gmail?focus=attention`. */
export const ATTENTION_ANCHOR = 'attention';

interface GmailAttentionCardProps {
  attentionData: PagedGmailAttention;
  attentionPage: number;
  onPageChange: (page: number) => void;
  onRetry: (ledgerId: string) => void;
  /** True when the page was opened from the "needs attention" push: scroll the card into view. */
  autoScroll?: boolean;
}

export function GmailAttentionCard({
  attentionData,
  attentionPage,
  onPageChange,
  onRetry,
  autoScroll = false,
}: GmailAttentionCardProps) {
  const [assigningItem, setAssigningItem] = useState<AttentionItem | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const hasItems = Boolean(attentionData && attentionData.content.length > 0);

  // The "needs attention" push deep-links to /settings/gmail?focus=attention; the page passes
  // that down because the card renders only once the data is in, after any native scroll.
  useEffect(() => {
    if (!hasItems || !autoScroll) return;
    cardRef.current?.scrollIntoView({ block: 'start' });
  }, [hasItems, autoScroll]);

  if (!hasItems) return null;

  return (
    <>
      <Card
        ref={cardRef}
        id={ATTENTION_ANCHOR}
        className="scroll-mt-4 border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10"
      >
        <CardHeader className="px-4 py-3 border-amber-200 dark:border-amber-900/50">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Needs Attention ({attentionData.totalElements})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-2">
          <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
            {attentionData.content.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.subject || item.gmailMessageId}
                    </span>
                    <Badge variant="warning" size="sm" className="shrink-0">
                      {item.status === 'ACCOUNT_NOT_OPTED_IN'
                        ? 'Not Opted In'
                        : item.status === 'UNRESOLVED_ACCOUNT'
                        ? 'Unresolved'
                        : 'Failed'}
                    </Badge>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 truncate">
                    {item.status === 'ACCOUNT_NOT_OPTED_IN'
                      ? `Waiting for account ending ••${
                          item.extractedLast4 || '????'
                        } — set an ingestion date on your account to activate`
                      : item.status === 'UNRESOLVED_ACCOUNT'
                      ? `No account matching ••${
                          item.extractedLast4 || '????'
                        } — assign to an account or create one`
                      : item.error || 'Ingestion failed permanently'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.status === 'UNRESOLVED_ACCOUNT' && item.extractedLast4 && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setAssigningItem(item)}
                    >
                      <UserPlus />
                      Assign
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onRetry(item.id)}
                  >
                    <RotateCcw />
                    Retry
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {attentionData.totalPages > 1 && (
            <div className="flex items-center justify-between py-2 border-t border-amber-100 dark:border-amber-900/30 text-2xs text-amber-800 dark:text-amber-300">
              <span>
                Page {attentionData.number + 1} of {attentionData.totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Previous page"
                  disabled={attentionData.number === 0}
                  onClick={() => onPageChange(attentionPage - 1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Next page"
                  disabled={
                    attentionData.number >= attentionData.totalPages - 1
                  }
                  onClick={() => onPageChange(attentionPage + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AssignAccountDialog
        open={Boolean(assigningItem)}
        onOpenChange={(open) => {
          if (!open) setAssigningItem(null);
        }}
        item={assigningItem}
      />
    </>
  );
}
