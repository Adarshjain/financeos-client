'use client';

import { Archive, ArchiveRestore, ChevronDown, RotateCcw, UserPlus } from 'lucide-react';
import React, { useId, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  type AttentionItem,
  describeAttentionItem,
  formatDateTime,
  gmailMessageUrl,
} from '@/features/settings/connections/attentionItem.helpers';
import { cn, formatDate } from '@/lib/utils';

interface AttentionItemRowProps {
  item: AttentionItem;
  onRetry: (ledgerId: string) => void;
  onAssign: (item: AttentionItem) => void;
  onArchive: (ledgerId: string) => void;
  onUnarchive: (ledgerId: string) => void;
}

function DetailRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="text-slate-500 dark:text-slate-400">{term}</dt>
      <dd className="min-w-0 break-words text-slate-700 dark:text-slate-300">{children}</dd>
    </div>
  );
}

/** One Gmail "needs attention" item: what happened, what to do, expandable raw details, and its actions. */
export function AttentionItemRow({ item, onRetry, onAssign, onArchive, onUnarchive }: AttentionItemRowProps) {
  const [showDetails, setShowDetails] = useState(false);
  const detailsId = useId();
  const { label, summary, hint } = describeAttentionItem(item);
  const archived = Boolean(item.archivedAt);
  const emailDate = item.internalDate ?? item.discoveredAt;

  return (
    <li data-testid="attention-item" className="py-3 text-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant="warning" size="sm" className="shrink-0">
              {label}
            </Badge>
            <span className="text-2xs text-slate-500 dark:text-slate-400">
              {formatDate(emailDate)}
              {item.senderAddress && <> · <span className="break-all">{item.senderAddress}</span></>}
            </span>
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 break-words line-clamp-2">
            {item.subject || '(no subject)'}
          </p>
          <p className="text-slate-600 dark:text-slate-300">{summary}</p>
          <p className="text-slate-500 dark:text-slate-400">{hint}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
          {archived ? (
            <Button variant="outline" size="xs" onClick={() => onUnarchive(item.id)}>
              <ArchiveRestore />
              Unarchive
            </Button>
          ) : (
            <>
              {item.status === 'UNRESOLVED_ACCOUNT' && item.extractedLast4 && (
                <Button variant="outline" size="xs" onClick={() => onAssign(item)}>
                  <UserPlus />
                  Assign
                </Button>
              )}
              <Button variant="outline" size="xs" onClick={() => onRetry(item.id)}>
                <RotateCcw />
                Retry
              </Button>
              <Button variant="ghost" size="xs" onClick={() => onArchive(item.id)}>
                <Archive />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="micro"
        className="mt-1 -ml-2"
        aria-expanded={showDetails}
        aria-controls={detailsId}
        onClick={() => setShowDetails((v) => !v)}
      >
        {showDetails ? 'Hide details' : 'Details'}
        <ChevronDown className={cn('transition-transform', showDetails && 'rotate-180')} />
      </Button>

      {showDetails && (
        <dl id={detailsId} className="mt-1 space-y-1 rounded-lg bg-white/60 dark:bg-slate-900/40 p-2 text-2xs">
          <DetailRow term="Mailbox">{item.connectionEmail}</DetailRow>
          <DetailRow term="From">{item.senderAddress || '—'}</DetailRow>
          <DetailRow term="Email date">{formatDateTime(item.internalDate)}</DetailRow>
          {item.extractedLast4 && <DetailRow term="Card / a/c">••{item.extractedLast4}</DetailRow>}
          {item.accountName && <DetailRow term="Account">{item.accountName}</DetailRow>}
          <DetailRow term="First seen">{formatDateTime(item.discoveredAt)}</DetailRow>
          <DetailRow term="Last tried">{formatDateTime(item.processedAt)}</DetailRow>
          {item.attemptCount > 0 && <DetailRow term="Attempts">{item.attemptCount}</DetailRow>}
          {archived && <DetailRow term="Archived">{formatDateTime(item.archivedAt)}</DetailRow>}
          <DetailRow term="Error">
            <span className="font-mono">{item.error || '—'}</span>
          </DetailRow>
          <DetailRow term="Email">
            <a
              href={gmailMessageUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
            >
              Open in Gmail
            </a>
          </DetailRow>
        </dl>
      )}
    </li>
  );
}
