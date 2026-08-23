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
import type { SyncMessageOutcome, SyncSummary } from '@/lib/types';
import { formatDate } from '@/lib/utils';

function formatFromHeader(from: string): string {
  if (!from) return '—';
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

export function GmailSyncResultDetails({ result }: { result: SyncSummary }) {
  const [attentionExpanded, setAttentionExpanded] = useState(false);

  const hasSkippedBreakdown =
    (result.alreadyProcessed !== undefined && result.alreadyProcessed > 0) ||
    (result.nonTransaction !== undefined && result.nonTransaction > 0);

  const getActionCell = (outcome: SyncMessageOutcome) => {
    switch (outcome.outcome) {
      case 'ACCOUNT_UNRESOLVED':
        return (
          <Link href="/accounts" className="underline font-bold text-2xs">
            {outcome.accountLast4
              ? `Add or fix account ending ${outcome.accountLast4}`
              : 'Add or fix account'}
          </Link>
        );
      case 'DECRYPT_FAILED':
        return (
          <Link href="/accounts" className="underline font-bold text-2xs">
            Set the statement password on the account
          </Link>
        );
      case 'PARSE_FAILED':
      case 'NO_ATTACHMENT':
        return (
          <Link href="/settings/ingest" className="underline font-bold text-2xs">
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
    <div className="space-y-2.5 text-2xs pt-1">
      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
        Gmail Sync Summary
      </span>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
        <div className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200/70 dark:border-slate-800 text-center">
          <div className="font-black text-slate-800 dark:text-slate-200 text-sm sm:text-base">{result.fetched ?? 0}</div>
          <div className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Fetched</div>
        </div>
        <div className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200/70 dark:border-slate-800 text-center">
          <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">{result.created ?? 0}</div>
          <div className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Created</div>
        </div>
        <div className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200/70 dark:border-slate-800 text-center">
          <div className="font-black text-blue-600 dark:text-blue-400 text-sm sm:text-base">{result.reconciled ?? 0}</div>
          <div className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Reconciled</div>
        </div>
        <div className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200/70 dark:border-slate-800 text-center">
          <div className="font-black text-slate-600 dark:text-slate-400 text-sm sm:text-base">{result.skipped ?? 0}</div>
          <div className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Skipped</div>
        </div>
        <div className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200/70 dark:border-slate-800 text-center col-span-3 sm:col-span-1">
          <div className="font-black text-rose-600 dark:text-rose-400 text-sm sm:text-base">{result.failed ?? 0}</div>
          <div className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Failed</div>
        </div>
      </div>

      {hasSkippedBreakdown && (
        <div className="text-2xs text-slate-500">
          Of the skipped: {result.alreadyProcessed ?? 0} already processed · {result.nonTransaction ?? 0} non-transaction emails
        </div>
      )}

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
    </div>
  );
}

