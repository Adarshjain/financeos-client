import Link from 'next/link';
import React from 'react';

import { formatDateTime, STATUS_LABELS } from '@/features/jobs/syncLabels';
import { legacyHref } from '@/features/shell/routes';
import type { SyncMessageResult } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

function Action({ message }: { message: SyncMessageResult }) {
  const linkClass = 'underline font-bold text-2xs';
  switch (message.status) {
    case 'UNRESOLVED_ACCOUNT':
      return (
        <Link href={legacyHref('/settings/gmail')} className={linkClass}>
          Assign an account in Gmail settings
        </Link>
      );
    case 'ACCOUNT_NOT_OPTED_IN':
      return (
        <Link href={legacyHref(message.accountId ? `/accounts/${message.accountId}` : '/accounts')} className={linkClass}>
          Set ingest date
        </Link>
      );
    case 'FAILED_RETRYABLE':
    case 'FAILED_PERMANENT':
      return (
        <span className="flex flex-wrap gap-x-2">
          {/decrypt/i.test(message.error ?? '') && (
            <Link href={legacyHref('/accounts')} className={linkClass}>
              Set the statement password on the account
            </Link>
          )}
          <Link href={legacyHref('/settings/gmail')} className={linkClass}>
            Retry from Gmail settings
          </Link>
          {message.attachmentFilename && (
            <Link href={legacyHref('/transactions/import')} className={linkClass}>
              Import manually
            </Link>
          )}
        </span>
      );
    default:
      return null;
  }
}

function Outcome({ message }: { message: SyncMessageResult }) {
  if (message.status === 'FAILED_RETRYABLE' || message.status === 'FAILED_PERMANENT') {
    return (
      <div className="space-y-0.5">
        <div className="text-rose-600 dark:text-rose-400 font-medium break-words">{message.error || 'Unknown error'}</div>
        <div className="text-slate-500">
          Attempt {message.attemptCount}
          {message.status === 'FAILED_RETRYABLE' && message.nextRetryAt && ` · next retry ${formatDateTime(message.nextRetryAt)}`}
          {message.status === 'FAILED_PERMANENT' && ' · no more automatic retries'}
        </div>
      </div>
    );
  }
  if (message.status === 'RECONCILED') {
    return (
      <div className="text-slate-600 dark:text-slate-400">
        {message.createdCount} new transaction{message.createdCount === 1 ? '' : 's'}, {message.matchedCount} matched to
        existing alerts
      </div>
    );
  }
  if (message.status === 'CREATED') return null;
  return <div className="text-slate-600 dark:text-slate-400 break-words">{message.error || STATUS_LABELS[message.status]}</div>;
}

/** One email of a sync run: who sent it, which account it landed on, what happened and what to do about it. */
export function SyncMessageRow({ message }: { message: SyncMessageResult }) {
  const more = message.createdCount - message.transactions.length;
  return (
    <li className="p-2.5 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={message.subject ?? undefined}>
            {message.subject || '—'}
          </div>
          <div className="text-slate-500 truncate">{message.sender || '—'}</div>
        </div>
        <span className="text-slate-400 tabular-nums shrink-0">{formatDate(message.receivedAt)}</span>
      </div>

      {(message.accountName || message.last4 || message.attachmentFilename) && (
        <div className="flex flex-wrap gap-x-2 text-slate-500">
          {message.accountName &&
            (message.accountId ? (
              <Link href={legacyHref(`/accounts/${message.accountId}`)} className="underline text-slate-700 dark:text-slate-300">
                {message.accountName}
              </Link>
            ) : (
              <span>{message.accountName}</span>
            ))}
          {message.last4 && <span>Card / a/c ••{message.last4}</span>}
          {message.attachmentFilename && <span className="truncate">File: {message.attachmentFilename}</span>}
        </div>
      )}

      <Outcome message={message} />

      {message.transactions.length > 0 && (
        <ul className="space-y-0.5">
          {message.transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
              <span className="truncate">
                <span className="tabular-nums text-slate-500">{formatDate(t.date)}</span> {t.description || '—'}
              </span>
              <span className="tabular-nums shrink-0">
                {t.type === 'CREDIT' ? '+' : ''}
                {formatCurrency(t.amount)}
              </span>
            </li>
          ))}
          {more > 0 && <li className="text-slate-500 italic">…and {more} more</li>}
        </ul>
      )}

      <Action message={message} />
    </li>
  );
}
