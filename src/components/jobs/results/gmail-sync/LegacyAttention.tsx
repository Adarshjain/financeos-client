import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatFromHeader } from '@/features/jobs/gmailSyncModel';
import { legacyHref } from '@/features/shell/routes';
import type { SyncMessageOutcome, SyncSummary } from '@/lib/types';
import { formatDate } from '@/lib/utils';

/** "Needs attention" table of results stored before per-email run detail existed. */
export function LegacyAttention({ result }: { result: SyncSummary }) {
  const [attentionExpanded, setAttentionExpanded] = useState(false);

  const getActionCell = (outcome: SyncMessageOutcome) => {
    switch (outcome.outcome) {
      case 'ACCOUNT_UNRESOLVED':
        return (
          <Link href={legacyHref('/accounts')} className="underline font-bold text-2xs">
            {outcome.accountLast4
              ? `Add or fix account ending ${outcome.accountLast4}`
              : 'Add or fix account'}
          </Link>
        );
      case 'DECRYPT_FAILED':
        return (
          <Link href={legacyHref('/accounts')} className="underline font-bold text-2xs">
            Set the statement password on the account
          </Link>
        );
      case 'PARSE_FAILED':
      case 'NO_ATTACHMENT':
        return (
          <Link href={legacyHref('/transactions/import')} className="underline font-bold text-2xs">
            Import manually
          </Link>
        );
      case 'EXTRACTION_FAILED':
      case 'ERROR':
      default:
        return <span className="text-slate-500 text-2xs">Will retry on next sync</span>;
    }
  };

  return (
    <>
      {result.attention && result.attention.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={() => setAttentionExpanded(!attentionExpanded)}
            className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 hover:underline focus:outline-none"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Needs attention ({result.attention.length})</span>
            {attentionExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            )}
          </button>

          {attentionExpanded && (
            <div className="border border-slate-200/70 dark:border-slate-800 rounded-md overflow-hidden bg-white dark:bg-slate-900">
              {/* Mobile Card List (< sm) */}
              <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                {result.attention.map((item: SyncMessageOutcome, idx: number) => (
                  <div key={idx} className="p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={item.from}>
                        {formatFromHeader(item.from)}
                      </span>
                      <span className="text-slate-400 text-2xs tabular-nums shrink-0">
                        {formatDate(item.receivedAt)}
                      </span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 font-medium">
                      <div className="truncate" title={item.subject}>
                        {item.subject || '—'}
                      </div>
                      {item.attachmentFilename && (
                        <div className="text-slate-400 text-2xs truncate">
                          File: {item.attachmentFilename}
                        </div>
                      )}
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                      <span className={item.outcome === 'ERROR' ? 'text-rose-600 dark:text-rose-400 font-medium text-2xs' : 'text-slate-600 dark:text-slate-400 text-2xs'}>
                        {item.reason}
                      </span>
                      <div className="shrink-0">
                        {getActionCell(item)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= sm) */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 dark:bg-slate-900/60">
                      <TableHead className="py-1.5 px-2 text-2xs whitespace-nowrap">From</TableHead>
                      <TableHead className="py-1.5 px-2 text-2xs">Subject</TableHead>
                      <TableHead className="py-1.5 px-2 text-2xs whitespace-nowrap">Date</TableHead>
                      <TableHead className="py-1.5 px-2 text-2xs">Problem</TableHead>
                      <TableHead className="py-1.5 px-2 text-2xs whitespace-nowrap">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.attention.map((item: SyncMessageOutcome, idx: number) => (
                      <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-900">
                        <TableCell className="py-1.5 px-2 text-2xs text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={item.from}>
                          {formatFromHeader(item.from)}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-2xs text-slate-700 dark:text-slate-300">
                          <div className="truncate max-w-[140px]" title={item.subject}>
                            {item.subject || '—'}
                          </div>
                          {item.attachmentFilename && (
                            <div className="text-slate-400 text-2xs truncate max-w-[140px]">
                              {item.attachmentFilename}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-2xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(item.receivedAt)}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-2xs">
                          <span className={item.outcome === 'ERROR' ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-700 dark:text-slate-300'}>
                            {item.reason}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-2xs whitespace-nowrap">
                          {getActionCell(item)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {result.attentionTruncated ? (
                <div className="py-1 px-2 text-2xs text-slate-500 italic bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-900">
                  …and {result.attentionTruncated} more
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </>
  );
}
