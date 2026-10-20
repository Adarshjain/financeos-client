import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

import { formatDateTime } from '@/features/jobs/syncLabels';
import type { SyncSummary } from '@/lib/types';
import { formatDate } from '@/lib/utils';

/** Which mailbox, senders and date window a sync run searched, and how much of what Gmail returned was new. */
export function SyncRunContext({ result }: { result: SyncSummary }) {
  const [sendersOpen, setSendersOpen] = useState(false);
  const senders = result.senders ?? [];

  return (
    <dl className="space-y-1 text-2xs text-slate-600 dark:text-slate-400">
      {result.mailbox && (
        <div className="flex gap-1.5">
          <dt className="text-slate-400 shrink-0">Mailbox</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-200 break-all">{result.mailbox}</dd>
        </div>
      )}
      <div className="flex gap-1.5">
        <dt className="text-slate-400 shrink-0">Searched</dt>
        <dd>
          {result.searchedSince ? `New mail since ${formatDateTime(result.searchedSince)}` : 'Nothing listed'}
          {result.backfilledTo && ` · backfilled to ${formatDate(result.backfilledTo)}`}
        </dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-slate-400 shrink-0">Found</dt>
        <dd>
          Gmail returned {result.listed ?? 0} email{result.listed === 1 ? '' : 's'}, {result.discovered ?? 0} new
        </dd>
      </div>
      <div>
        <button
          type="button"
          onClick={() => setSendersOpen((v) => !v)}
          disabled={senders.length === 0}
          className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:underline disabled:no-underline focus:outline-none"
        >
          {senders.length > 0 &&
            (sendersOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
          <span>Senders checked ({senders.length})</span>
        </button>
        {sendersOpen && (
          <ul className="mt-1 ml-4 space-y-0.5 text-slate-700 dark:text-slate-300">
            {senders.map((s) => (
              <li key={s} className="break-all">{s}</li>
            ))}
          </ul>
        )}
      </div>
    </dl>
  );
}
