'use client';

import { CornerDownRight, Link2, Loader2, ShieldCheck, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Account } from '@/lib/account.types';
import { getDerivedRoleLabel, LinkType } from '@/lib/transaction.helpers';
import { Transaction, TransactionLinkResponse } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney, getAccountName } from '@/lib/utils';

interface LinkedTransactionsSectionProps {
  transaction: Transaction;
  accounts: Account[];
  links: TransactionLinkResponse[];
  loadingLinks: boolean;
  linksError: string | null;
  unlinkingId: string | null;
  fetchLinks: () => void;
  handleUnlink: (linkId: string) => void;
}

export function LinkedTransactionsSection({
  transaction,
  accounts,
  links,
  loadingLinks,
  linksError,
  unlinkingId,
  fetchLinks,
  handleUnlink,
}: LinkedTransactionsSectionProps) {
  const accountName = (accountId: string | undefined) =>
    getAccountName(accounts, accountId);

  if (links.length === 0 && !linksError) return null;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-indigo-500" /> Linked Transactions
        </span>
      </div>

      {loadingLinks ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      ) : linksError ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <span className="text-xs text-destructive">
            Couldn&apos;t load links: {linksError}
          </span>
          <button
            type="button"
            onClick={fetchLinks}
            className="text-xs font-semibold text-destructive underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      ) : (
        links.map((link) => {
          const thisMember = link.members.find(
            (m) => m.transactionId === transaction.id
          );
          const parentMember = link.members.find((m) => m.isAnchor);
          const childMembers = link.members.filter((m) => !m.isAnchor);
          const isCurrentParent = thisMember?.isAnchor ?? false;
          const otherSiblings = childMembers.filter(
            (m) => m.transactionId !== transaction.id
          );

          return (
            <div
              key={link.id}
              className="p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/30 dark:bg-indigo-950/10 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-2xs font-bold',
                      isCurrentParent
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    )}
                  >
                    {isCurrentParent ? 'Parent Transaction' : 'Child Transaction'} •{' '}
                    {link.type}
                  </Badge>
                </div>
                <Button
                  variant="ghost-destructive"
                  size="micro"
                  onClick={() => handleUnlink(link.id)}
                  disabled={unlinkingId === link.id}
                >
                  {unlinkingId === link.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Unlink
                </Button>
              </div>

              {link.note && (
                <p className="text-xs italic text-slate-500 dark:text-slate-400">
                  {link.note}
                </p>
              )}

              {/* If current transaction is a child, prominently display the Parent Transaction */}
              {!isCurrentParent && parentMember && (
                <div className="p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Parent Transaction
                    </span>
                    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-2xs font-bold">
                      {parentMember.roleLabel ||
                        getDerivedRoleLabel(link.type as LinkType, true)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {parentMember.description}
                      </span>
                      <div className="flex items-center gap-1.5 text-2xs text-slate-500 dark:text-slate-400">
                        <span>{formatDate(parentMember.date)}</span>
                        <span>•</span>
                        <span>{accountName(parentMember.accountId)}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'font-bold tabular-nums shrink-0',
                        parentMember.signedAmount >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      )}
                    >
                      {parentMember.signedAmount >= 0 ? '+' : '-'}
                      {formatMoney(Math.abs(parentMember.signedAmount))}
                    </span>
                  </div>
                </div>
              )}

              {/* List child transactions */}
              {(isCurrentParent ? childMembers : otherSiblings).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {isCurrentParent
                      ? `Child Transactions (${childMembers.length})`
                      : 'Sibling Counterparts'}
                  </span>
                  {(isCurrentParent ? childMembers : otherSiblings).map((m) => (
                    <div
                      key={m.transactionId}
                      className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {m.description}
                        </span>
                        <div className="flex items-center gap-1.5 text-2xs text-slate-400">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                            <CornerDownRight className="h-2.5 w-2.5 inline" />{' '}
                            {m.roleLabel ||
                              getDerivedRoleLabel(link.type as LinkType, m.isAnchor)}
                          </span>
                          <span>•</span>
                          <span>{formatDate(m.date)}</span>
                          <span>•</span>
                          <span>{accountName(m.accountId)}</span>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'font-bold tabular-nums pl-2',
                          m.signedAmount >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {m.signedAmount >= 0 ? '+' : '-'}
                        {formatMoney(Math.abs(m.signedAmount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
