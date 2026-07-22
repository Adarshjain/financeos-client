'use client';

import { Check, Link2, Loader2, Search, X } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { createTransactionLink } from '@/actions/transaction-links';
import { searchTransactions } from '@/actions/transactions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Account } from '@/lib/account.types';
import type { CreateTransactionLinkRequest, LinkType, MemberRef, Transaction } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

const EMPTY_TXN_ARRAY: Transaction[] = [];

interface TransactionLinkDialogProps {
  initialTransaction?: Transaction;
  initialSelectedTransactions?: Transaction[];
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TransactionLinkDialog({
  initialTransaction,
  initialSelectedTransactions = EMPTY_TXN_ARRAY,
  accounts,
  open,
  onOpenChange,
  onSuccess,
}: TransactionLinkDialogProps) {
  const [linkType, setLinkType] = React.useState<LinkType>('TRANSFER');
  const [note, setNote] = React.useState('');
  const [alignRefundCategories, setAlignRefundCategories] = React.useState(true);
  const [selectedTransactions, setSelectedTransactions] = React.useState<Transaction[]>([]);
  const [anchorId, setAnchorId] = React.useState<string>('');
  const [candidateSearch, setCandidateSearch] = React.useState('');
  const [candidateResults, setCandidateResults] = React.useState<Transaction[]>([]);
  const [loadingCandidates, setLoadingCandidates] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const prevOpenRef = React.useRef(false);

  // Initialize selected transactions when dialog opens
  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      let initial: Transaction[] = [];
      if (initialTransaction) {
        initial = [initialTransaction];
      } else if (initialSelectedTransactions.length > 0) {
        initial = [...initialSelectedTransactions];
      }
      setSelectedTransactions(initial);

      // Default anchor to the first DEBIT transaction or the first transaction
      const defaultAnchor = initial.find((t) => t.amount < 0) || initial[0];
      if (defaultAnchor) {
        setAnchorId(defaultAnchor.id);
      } else {
        setAnchorId('');
      }

      setNote('');
      setAlignRefundCategories(true);
      setCandidateSearch('');
      setCandidateResults([]);
    }
    prevOpenRef.current = open;
  }, [open, initialTransaction, initialSelectedTransactions]);

  const getAccount = (accountId: string) => accounts.find((a) => a.id === accountId);

  const anchorTx = selectedTransactions.find((t) => t.id === anchorId);

  // Fetch candidate transactions for linking
  const fetchCandidates = React.useCallback(async (query: string, type: LinkType, anchor?: Transaction) => {
    setLoadingCandidates(true);
    try {
      const filters: import('@/lib/reports.types').FilterClause[] = [];

      if (anchor) {
        const anchorDebit = anchor.amount < 0;
        if (type === 'TRANSFER' || type === 'CC_PAYMENT' || type === 'REFUND') {
          // Counterparts are CREDITs
          filters.push({ field: 'type', operator: 'is', value: 'CREDIT' });
        } else if (type === 'FEE' || type === 'EMI') {
          // Counterparts are DEBITs
          filters.push({ field: 'type', operator: 'is', value: 'DEBIT' });
        } else if (type === 'REVERSAL') {
          // Opposite of anchor
          filters.push({ field: 'type', operator: 'is', value: anchorDebit ? 'CREDIT' : 'DEBIT' });
        }
      }

      const res = await searchTransactions(
        {
          filters,
          search: query.trim() || null,
        },
        0,
        50,
      );
      if (res.success) {
        setCandidateResults(res.data.content);
      }
    } catch {
      // Ignore background errors
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchCandidates(candidateSearch, linkType, anchorTx);
    }, 300);
    return () => clearTimeout(timer);
  }, [open, candidateSearch, linkType, anchorTx, fetchCandidates]);

  // Filter candidates according to selected linkType rules & exclusions
  const filteredCandidates = React.useMemo(() => {
    const selectedIds = new Set(selectedTransactions.map((t) => t.id));
    const anchorTx = selectedTransactions.find((t) => t.id === anchorId);

    return candidateResults.filter((t) => {
      if (selectedIds.has(t.id)) return false;
      // Do not allow linking transactions that are already linked
      if (t.links && t.links.length > 0) return false;

      if (!anchorTx) return true;

      const isDebit = t.amount < 0;
      const isCredit = t.amount >= 0;
      const anchorDebit = anchorTx.amount < 0;

      switch (linkType) {
        case 'TRANSFER':
          // 1 counterpart CREDIT on a different account
          return isCredit && t.accountId !== anchorTx.accountId;
        case 'CC_PAYMENT':
          // 1 counterpart CREDIT on a credit card account
          const acc = getAccount(t.accountId);
          return isCredit && acc?.type === 'credit_card';
        case 'REVERSAL':
          // Opposite direction, same account
          return isDebit !== anchorDebit && t.accountId === anchorTx.accountId;
        case 'REFUND':
          // Counterparts are CREDITs
          return isCredit;
        case 'FEE':
          // Counterparts are DEBITs
          return isDebit;
        case 'EMI':
          // Counterparts are DEBITs
          return isDebit;
        default:
          return true;
      }
    });
  }, [candidateResults, selectedTransactions, anchorId, linkType, accounts]);

  const toggleSelectTransaction = (t: Transaction) => {
    if (selectedTransactions.some((s) => s.id === t.id)) {
      const next = selectedTransactions.filter((s) => s.id !== t.id);
      setSelectedTransactions(next);
      if (anchorId === t.id) {
        const nextAnchor = next.find((item) => item.amount < 0) || next[0];
        setAnchorId(nextAnchor ? nextAnchor.id : '');
      }
    } else {
      const next = [...selectedTransactions, t];
      setSelectedTransactions(next);
      if (!anchorId) {
        setAnchorId(t.id);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedTransactions.length < 2) {
      toast.error('Select at least 2 transactions to link');
      return;
    }
    if (!anchorId) {
      toast.error('Select an anchor transaction');
      return;
    }

    setSubmitting(true);
    try {
      const members: MemberRef[] = selectedTransactions.map((t) => ({
        transactionId: t.id,
        isAnchor: t.id === anchorId,
      }));

      const payload: CreateTransactionLinkRequest = {
        type: linkType,
        members,
      };
      if (note.trim()) {
        payload.note = note.trim();
      }
      if (linkType === 'REFUND') {
        payload.alignRefundCategories = alignRefundCategories;
      }

      const res = await createTransactionLink(payload);

      if (res.success) {
        toast.success('Transactions linked successfully');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(res.error.message || 'Failed to link transactions');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getRuleHint = () => {
    if (!anchorTx) return 'Select an anchor transaction above.';
    switch (linkType) {
      case 'TRANSFER':
        return 'TRANSFER requires a Credit (income/transfer in) transaction on a different account.';
      case 'CC_PAYMENT':
        return 'CC_PAYMENT requires a Credit transaction posted to a Credit Card account.';
      case 'REVERSAL':
        return 'REVERSAL requires an opposite-direction transaction on the same account.';
      case 'REFUND':
        return 'REFUND requires Credit (refund/income) transactions.';
      case 'FEE':
        return 'FEE requires Debit (fee/charge) transactions.';
      case 'EMI':
        return 'EMI requires Debit (installment) transactions.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Link2 className="h-5 w-5 text-indigo-500" />
            Link Transactions
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Establish settlement link accounting relationships between transactions.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          {/* Link Type & Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Link Type</Label>
              <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFER">Transfer (Bank / Wallet)</SelectItem>
                  <SelectItem value="CC_PAYMENT">Credit Card Bill Payment</SelectItem>
                  <SelectItem value="REFUND">Refund / Partial Refund</SelectItem>
                  <SelectItem value="REVERSAL">Reversal</SelectItem>
                  <SelectItem value="FEE">Fee / Surcharge</SelectItem>
                  <SelectItem value="EMI">EMI / Installment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Note (Optional)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Monthly CC bill settlement"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Refund category alignment checkbox */}
          {linkType === 'REFUND' && (
            <div className="flex items-center space-x-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <Checkbox
                id="align-refund"
                checked={alignRefundCategories}
                onCheckedChange={(checked) => setAlignRefundCategories(!!checked)}
              />
              <label
                htmlFor="align-refund"
                className="text-xs font-medium text-indigo-900 dark:text-indigo-200 cursor-pointer"
              >
                Align refund category to original purchase
              </label>
            </div>
          )}

          {/* Member Selection Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Selected Transactions ({selectedTransactions.length})
              </Label>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">Select 1 Parent (Anchor) transaction</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedTransactions.map((t) => {
                const isAnchor = t.id === anchorId;
                const acc = getAccount(t.accountId);
                return (
                  <div
                    key={t.id}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all',
                      isAnchor
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 dark:border-indigo-600'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900',
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <input
                        type="radio"
                        name="anchor"
                        checked={isAnchor}
                        onChange={() => setAnchorId(t.id)}
                        className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Set as Parent (Anchor)"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {t.description || t.sourcedDescription}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{formatDate(t.date)}</span>
                          <span>•</span>
                          <span>{acc?.name || 'Unknown Account'}</span>
                          {isAnchor ? (
                            <Badge className="text-[9px] py-0 px-1.5 h-4 bg-indigo-100 text-indigo-800 font-bold dark:bg-indigo-900/80 dark:text-indigo-200">
                              Parent (Anchor)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 text-slate-500 dark:text-slate-400">
                              Child
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'font-bold tabular-nums',
                          t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                        )}
                      >
                        {t.amount >= 0 ? '+' : '-'}{formatMoney(Math.abs(t.amount))}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSelectTransaction(t)}
                        className="h-6 w-6 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Counterparts Search */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Find Counterpart Transactions
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                placeholder="Search by description or amount..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {loadingCandidates ? (
                <div className="flex justify-center py-6 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-6 px-3 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No matching counterpart transactions found</p>
                  <p className="text-[11px] text-slate-400 italic">{getRuleHint()}</p>
                </div>
              ) : (
                filteredCandidates.map((t) => {
                  const acc = getAccount(t.accountId);
                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleSelectTransaction(t)}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {t.description || t.sourcedDescription}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{formatDate(t.date)}</span>
                          <span>•</span>
                          <span>{acc?.name || 'Unknown'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-bold tabular-nums',
                            t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                          )}
                        >
                          {t.amount >= 0 ? '+' : '-'}{formatMoney(Math.abs(t.amount))}
                        </span>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2">
                          Add
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || selectedTransactions.length < 2 || !anchorId}
            className="h-8 text-xs gap-1.5"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Link Transactions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
