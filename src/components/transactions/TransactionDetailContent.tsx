'use client';

import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CornerDownRight,
  CreditCard,
  Link2,
  Loader2,
  PencilIcon,
  Scale,
  ShieldCheck,
  Tag,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { deleteTransactionLink, getTransactionLinks } from '@/actions/transaction-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { Transaction, TransactionLinkResponse } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { DeleteTransaction } from './DeleteTransaction';
import { ReviewReasonBadges } from './ReviewReasonBadges';
import { TransactionLinkDialog } from './TransactionLinkDialog';

interface TransactionDetailContentProps {
  transaction: Transaction;
  accounts: Account[];
  onEditClick: () => void;
  onDeleteSuccess: () => void;
}

export const TransactionDetailContent = ({
                                           transaction,
                                           accounts,
                                           onEditClick,
                                           onDeleteSuccess,
                                         }: TransactionDetailContentProps) => {
  const [links, setLinks] = React.useState<TransactionLinkResponse[]>([]);
  const [loadingLinks, setLoadingLinks] = React.useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [unlinkingId, setUnlinkingId] = React.useState<string | null>(null);

  const hasLinks = (transaction.links?.length ?? 0) > 0;

  const fetchLinks = React.useCallback(async () => {
    if (!hasLinks) {
      setLinks([]);
      return;
    }
    setLoadingLinks(true);
    try {
      const res = await getTransactionLinks(transaction.id);
      if (res.success) {
        setLinks(res.data);
      }
    } catch {
      // Ignore background errors
    } finally {
      setLoadingLinks(false);
    }
  }, [transaction.id, hasLinks]);

  React.useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleUnlink = async (linkId: string) => {
    setUnlinkingId(linkId);
    try {
      const res = await deleteTransactionLink(linkId);
      if (res.success) {
        toast.success('Link removed successfully');
        fetchLinks();
        onDeleteSuccess(); // Triggers parent reload
      } else {
        toast.error(res.error.message || 'Failed to unlink');
      }
    } catch {
      toast.error('Failed to unlink transaction');
    } finally {
      setUnlinkingId(null);
    }
  };

  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const getSource = () => {
    switch (transaction.source) {
      case 'gmail_transaction_alert':
        return 'Gmail Alert';
      case 'gmail_statement':
        return 'Gmail Statement';
      case 'manual':
        return 'Manual Entry';
      case 'file_upload':
        return 'File Upload';
      default:
        return 'Unknown Source';
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto max-h-[90vh] sm:max-h-[85vh] scrollbar-thin">
      {/* Modal Hero / Header */}
      <DialogHeader
        className="relative p-3 pb-4 text-center sm:text-center bg-white dark:bg-slate-900 border-b border-slate-100/50 dark:border-slate-800/50 block"
      >
        <div className="flex justify-center mb-3">
          <div
            className={cn(
              'p-3 rounded-full shadow-inner inline-block',
              transaction.amount >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-500'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400',
            )}
          >
            {transaction.amount >= 0 ? (
              <ArrowDownLeft className="h-6 w-6" />
            ) : (
              <ArrowUpRight className="h-6 w-6" />
            )}
          </div>
        </div>

        <DialogTitle
          className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight mb-1 break-words text-center">
          {transaction.sourcedDescription}
        </DialogTitle>

        {transaction.description && <div className="text-base text-slate-500 dark:text-slate-400">
          {transaction.description}
        </div>}

        <div
          className={cn(
            'text-3xl font-black tracking-tight tabular-nums mt-3',
            transaction.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
          )}
        >
          {transaction.amount >= 0 ? '' : '-'}{formatMoney(Math.abs(transaction.amount))}
        </div>

        {transaction.balance !== null && transaction.balance !== undefined && (
          <div
            className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-2 tabular-nums bg-slate-50 dark:bg-slate-900/50 inline-block px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-800/40">
            Balance: {formatMoney(transaction.balance)}
          </div>
        )}
      </DialogHeader>

      {/* Content Details */}
      <div className="p-3 space-y-3 flex-1">
        {/* Warnings / Status alerts */}
        {transaction.isTransactionExcluded && (
          <span
            className="flex items-start gap-2.5 py-3 px-4 rounded-xl border border-rose-200/50 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/10 text-rose-800 dark:text-rose-400 text-xs leading-relaxed">
            <TriangleAlert className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <span className="font-bold">Transaction Excluded</span>
          </span>
        )}

        {transaction.isTransactionUnderMonitoring && (
          <div
            className="flex items-start gap-2.5 py-3 px-4 rounded-xl border border-amber-200/50 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10 text-amber-800 dark:text-amber-400 text-xs leading-relaxed">
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold mb-0.5">Under Monitoring</span>
              {transaction.monitoringReason && <>: <span
                className="italic font-medium text-amber-700 dark:text-amber-350">{transaction.monitoringReason}</span>
              </>}
            </div>
          </div>
        )}

        {/* Metadata Grid */}
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/30 dark:border-slate-800/40 divide-y divide-slate-100 dark:divide-slate-800/50 overflow-hidden shadow-sm">
          {/* Account */}
          <div className="flex items-center justify-between py-3 px-4 text-sm">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
              <CreditCard className="h-4 w-4 text-slate-400" /> Account
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {getAccountName(transaction.accountId)}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center justify-between py-3 px-4 text-sm">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
              <Calendar className="h-4 w-4 text-slate-400" /> Date
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {new Date(transaction.date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Categories */}
          <div className="flex items-start justify-between py-3 px-4 text-sm gap-4">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium mt-0.5">
              <Tag className="h-4 w-4 text-slate-400" /> Categories
            </span>
            <div className="flex flex-wrap gap-1 flex-end">
              {(transaction.categories ?? []).length > 0 ? (
                transaction.categories?.map((category) => (
                  <Badge
                    variant="outline"
                    className="rounded-full px-2.5 text-[10px] py-0.5 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 bg-slate-50 dark:bg-slate-900"
                    key={category.id}
                  >
                    {category.name}
                  </Badge>
                ))
              ) : (
                <span className="text-slate-400 dark:text-slate-600 italic text-xs">None</span>
              )}
            </div>
          </div>

          {/* MCC Code */}
          {transaction.mcc && (
            <div className="flex items-center justify-between py-3 px-4 text-sm">
              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
                <Tag className="h-4 w-4 text-slate-400" /> MCC Code
              </span>
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {transaction.mcc}
              </span>
            </div>
          )}

          {/* Source */}
          <div className="flex items-center justify-between py-3 px-4 text-sm">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
              <Scale className="h-4 w-4 text-slate-400" /> Source
            </span>
            <div className="font-semibold text-slate-800 dark:text-slate-200">{getSource()}</div>
          </div>

          {/* Review Type */}
          <div className="flex items-center justify-between py-3 px-4 text-sm">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-slate-400" /> Review Status
            </span>
            <div className="flex flex-wrap gap-1 justify-end">
              <ReviewReasonBadges
                reviewType={transaction.reviewType}
                reviewReasons={transaction.reviewReasons}
              />
            </div>
          </div>
        </div>

        {/* Linked Transactions Section */}
        {links.length > 0 && (
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
            ) : (
              links.map((link) => {
                const thisMember = link.members.find((m) => m.transactionId === transaction.id);
                const parentMember = link.members.find((m) => m.isAnchor);
                const childMembers = link.members.filter((m) => !m.isAnchor);
                const isCurrentParent = thisMember?.isAnchor ?? false;
                const otherSiblings = childMembers.filter((m) => m.transactionId !== transaction.id);

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
                            'text-[10px] font-bold',
                            isCurrentParent
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                          )}
                        >
                          {isCurrentParent ? 'Parent Transaction' : 'Child Transaction'} • {link.type}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlink(link.id)}
                        disabled={unlinkingId === link.id}
                        className="h-6 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 px-2"
                      >
                        {unlinkingId === link.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Unlink
                      </Button>
                    </div>

                    {link.note && (
                      <p className="text-[11px] italic text-slate-500 dark:text-slate-400">{link.note}</p>
                    )}

                    {/* If current transaction is a child, prominently display the Parent Transaction */}
                    {!isCurrentParent && parentMember && (
                      <div className="p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" /> Parent Transaction
                          </span>
                          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-[9px] font-bold">
                            {parentMember.roleLabel}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {parentMember.description}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                              <span>{formatDate(parentMember.date)}</span>
                              <span>•</span>
                              <span>{getAccountName(parentMember.accountId)}</span>
                            </div>
                          </div>
                          <span
                            className={cn(
                              'font-bold tabular-nums shrink-0',
                              parentMember.signedAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white',
                            )}
                          >
                            {parentMember.signedAmount >= 0 ? '+' : '-'}{formatMoney(Math.abs(parentMember.signedAmount))}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* List child transactions */}
                    {(isCurrentParent ? childMembers : otherSiblings).length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {isCurrentParent ? `Child Transactions (${childMembers.length})` : 'Sibling Counterparts'}
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
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                                  <CornerDownRight className="h-2.5 w-2.5 inline" /> {m.roleLabel}
                                </span>
                                <span>•</span>
                                <span>{formatDate(m.date)}</span>
                                <span>•</span>
                                <span>{getAccountName(m.accountId)}</span>
                              </div>
                            </div>

                            <span
                              className={cn(
                                'font-bold tabular-nums pl-2',
                                m.signedAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                              )}
                            >
                              {m.signedAmount >= 0 ? '+' : '-'}{formatMoney(Math.abs(m.signedAmount))}
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
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLinkDialogOpen(true)}
            className="h-9 rounded-lg gap-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-850 transition-colors"
          >
            <Link2 className="h-3.5 w-3.5 text-indigo-500" />
            Link to…
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEditClick}
            className="h-9 rounded-lg gap-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-850 transition-colors"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        <DeleteTransaction transaction={transaction} onSuccess={onDeleteSuccess} />
      </div>

      <TransactionLinkDialog
        initialTransaction={transaction}
        accounts={accounts}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onSuccess={() => {
          fetchLinks();
          onDeleteSuccess(); // Refreshes parent browser
        }}
      />
    </div>
  );
};

