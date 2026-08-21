'use client';

import React from 'react';

import type { SyncSummary } from '@/lib/types';

export function GmailSyncResultDetails({ result }: { result: SyncSummary }) {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-2xs">
      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
        Gmail Sync Summary
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="p-1.5 bg-white dark:bg-slate-900 rounded border text-center">
          <div className="font-bold text-slate-950 dark:text-white text-xs">{result.fetched ?? 0}</div>
          <div className="text-2xs text-slate-500 uppercase">Fetched</div>
        </div>
        <div className="p-1.5 bg-white dark:bg-slate-900 rounded border text-center">
          <div className="font-bold text-emerald-600 text-xs">{result.created ?? 0}</div>
          <div className="text-2xs text-slate-500 uppercase">Created</div>
        </div>
        <div className="p-1.5 bg-white dark:bg-slate-900 rounded border text-center">
          <div className="font-bold text-blue-600 text-xs">{result.reconciled ?? 0}</div>
          <div className="text-2xs text-slate-500 uppercase">Reconciled</div>
        </div>
        <div className="p-1.5 bg-white dark:bg-slate-900 rounded border text-center">
          <div className="font-bold text-slate-600 text-xs">{result.skipped ?? 0}</div>
          <div className="text-2xs text-slate-500 uppercase">Skipped</div>
        </div>
        <div className="p-1.5 bg-white dark:bg-slate-900 rounded border text-center">
          <div className="font-bold text-rose-600 text-xs">{result.failed ?? 0}</div>
          <div className="text-2xs text-slate-500 uppercase">Failed</div>
        </div>
      </div>
    </div>
  );
}
