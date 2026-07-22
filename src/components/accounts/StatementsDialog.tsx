'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import React, { JSX, useCallback, useEffect, useState } from 'react';

import { getCardCycleSummary } from '@/actions/accounts';
import { getStatementDetail, listStatementsByAccount } from '@/actions/statements';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Account } from '@/lib/account.types';
import { ReviewType,StatementDetail, StatementSummary, StatementVerdict } from '@/lib/statement.types';
import { AccountType } from '@/lib/types';
import { cn, formatDate, formatMoney, formatNullableMoney } from '@/lib/utils';

interface StatementsDialogProps {
  account: Account;
  trigger: JSX.Element;
}

export function StatementsDialog({ account, trigger }: StatementsDialogProps) {
  const [open, setOpen] = useState(false);
  const [statements, setStatements] = useState<StatementSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<StatementDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [cardSummary, setCardSummary] = useState<import('@/lib/statement.types').CardCycleSummary | null>(null);
  const [isLoadingCardSummary, setIsLoadingCardSummary] = useState(false);

  const loadStatements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await listStatementsByAccount(account.id);
    if (res.success && res.data) {
      setStatements(res.data);
    } else if (!res.success) {
      setError(res.error.message || 'Failed to load statements');
    }
    setIsLoading(false);

    if (account.type === AccountType.CREDIT_CARD) {
      setIsLoadingCardSummary(true);
      const sumRes = await getCardCycleSummary(account.id);
      if (sumRes.success && sumRes.data) {
        setCardSummary(sumRes.data);
      } else {
        setCardSummary(null);
      }
      setIsLoadingCardSummary(false);
    }
  }, [account.id, account.type]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedStatementId(null);
      setSelectedDetail(null);
    }
  };

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        loadStatements();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [open, loadStatements]);

  const handleSelectStatement = async (statementId: string) => {
    setSelectedStatementId(statementId);
    setSelectedDetail(null);
    setIsLoadingDetail(true);
    setDetailError(null);
    const res = await getStatementDetail(statementId);
    if (res.success && res.data) {
      setSelectedDetail(res.data);
    } else if (!res.success) {
      setDetailError(res.error.message || 'Failed to load statement details');
    }
    setIsLoadingDetail(false);
  };

  const lastIngestionDate = statements.length > 0
    ? statements.reduce((max, s) => {
        const d = new Date(s.createdAt).getTime();
        return d > max ? d : max;
      }, 0)
    : null;

  const getVerdictBadge = (verdict: StatementVerdict) => {
    switch (verdict) {
      case 'AUTO_INGEST':
        return (
          <span title="Statement parsed clean with 100% chain continuity and valid checksums. Automatically accepted.">
            <Badge variant="success" className="cursor-help">Auto Ingested</Badge>
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span title="Statement parsed with minor issues or chain validation gaps (< 99%). Review required before final reconciliation.">
            <Badge variant="warning" className="cursor-help">Needs Review</Badge>
          </span>
        );
      case 'REJECTED':
        return (
          <span title="Statement failed critical validation (broken checksum, missing opening/closing balances, or unparseable format).">
            <Badge variant="danger" className="cursor-help">Rejected</Badge>
          </span>
        );
      default:
        return <Badge variant="secondary">{verdict}</Badge>;
    }
  };

  const getReviewTypeBadge = (reviewType: ReviewType) => {
    switch (reviewType) {
      case 'AUTO_REVIEWED':
        return <Badge variant="success">Auto Reviewed</Badge>;
      case 'NEEDS_REVIEW':
        return <Badge variant="warning">Needs Review</Badge>;
      case 'MANUALLY_REVIEWED':
        return <Badge variant="info">Manually Reviewed</Badge>;
      default:
        return <Badge variant="secondary">{reviewType}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-5xl sm:max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div className="flex flex-col items-start">
              <div className="text-slate-400 dark:text-slate-500 text-sm">Statements Archive</div>
              <div>{account.name}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Card Cycle Summary Card for Credit Cards */}
        {account.type === AccountType.CREDIT_CARD && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900/60 space-y-5 shadow-sm mb-2">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Card Cycle Summary</h3>
              </div>
              {cardSummary?.periodEnd && (
                <span className="text-xs font-mono text-slate-500">
                  Statement Date: {formatDate(cardSummary.periodEnd)}
                </span>
              )}
            </div>

            {isLoadingCardSummary ? (
              <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span className="text-xs">Loading card cycle summary...</span>
              </div>
            ) : !cardSummary || !cardSummary.statementId ? (
              <div className="text-center py-4 text-xs text-slate-400">
                No active statement summary available for this credit card.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Hero Metric & Secondary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <div className="md:col-span-1 space-y-1 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Total Amount Due</span>
                    <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                      {formatNullableMoney(cardSummary.totalAmountDue)}
                    </div>
                    {cardSummary.daysUntilDue !== null && cardSummary.daysUntilDue !== undefined ? (
                      <div className="pt-1">
                        {cardSummary.daysUntilDue > 0 ? (
                          <Badge variant={cardSummary.daysUntilDue <= 3 ? 'warning' : 'secondary'} className="text-[10px]">
                            Due in {cardSummary.daysUntilDue} days
                          </Badge>
                        ) : cardSummary.daysUntilDue === 0 ? (
                          <Badge variant="warning" className="text-[10px] bg-amber-500 text-white">
                            Due today
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="text-[10px]">
                            {Math.abs(cardSummary.daysUntilDue)} days overdue
                          </Badge>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block">Minimum Due</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white mt-1 block tabular-nums">
                        {formatNullableMoney(cardSummary.minimumAmountDue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block">Payment Due Date</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block">
                        {formatDate(cardSummary.paymentDueDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block">Reward Points</span>
                      <span className="font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 block tabular-nums">
                        {cardSummary.rewardPointsBalance !== null && cardSummary.rewardPointsBalance !== undefined
                          ? cardSummary.rewardPointsBalance.toLocaleString()
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-slate-500">
                        <span>Utilization</span>
                        <span className={cn('font-bold font-mono', cardSummary.utilizationPct !== null && cardSummary.utilizationPct !== undefined ? (cardSummary.utilizationPct < 30 ? 'text-emerald-600 dark:text-emerald-400' : cardSummary.utilizationPct < 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400') : 'text-slate-700 dark:text-slate-300')}>
                          {cardSummary.utilizationPct !== null && cardSummary.utilizationPct !== undefined ? `${cardSummary.utilizationPct}%` : '—'}
                        </span>
                      </div>
                      {cardSummary.utilizationPct !== null && cardSummary.utilizationPct !== undefined ? (
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={cn('h-full rounded-full transition-all duration-300', cardSummary.utilizationPct < 30 ? 'bg-emerald-500' : cardSummary.utilizationPct < 70 ? 'bg-amber-500' : 'bg-red-500')}
                            style={{ width: `${Math.min(100, Math.max(0, Number(cardSummary.utilizationPct)))}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Cycle History Table */}
                {cardSummary.history && cardSummary.history.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Past Cycle History ({cardSummary.history.length})
                    </h4>
                    {/* Mobile Card List View */}
                    <div className="md:hidden space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {cardSummary.history.map((h, i) => (
                        <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-xs space-y-2 shadow-2xs">
                          <div className="flex justify-between items-center font-semibold font-mono pb-1.5 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                            <span>Period End: {formatDate(h.periodEnd)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-400 block">Purchases</span>
                              <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">{formatNullableMoney(h.totalPurchases)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Payments</span>
                              <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{h.paymentsReceived !== null && h.paymentsReceived !== undefined ? `+${formatMoney(h.paymentsReceived)}` : '—'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Finance Chg.</span>
                              <span className="font-mono tabular-nums text-red-600 dark:text-red-400">{formatNullableMoney(h.financeCharges)}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Fees & Chg.</span>
                              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">{formatNullableMoney(h.feesAndCharges)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop Table View */}
                    <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50 dark:bg-slate-900/40 text-[11px]">
                            <TableHead>Period End</TableHead>
                            <TableHead className="text-right">Total Purchases</TableHead>
                            <TableHead className="text-right">Payments Received</TableHead>
                            <TableHead className="text-right">Finance Charges</TableHead>
                            <TableHead className="text-right">Fees & Charges</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cardSummary.history.map((h, i) => (
                            <TableRow key={i} className="text-xs">
                              <TableCell className="font-medium font-mono">
                                {formatDate(h.periodEnd)}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums font-medium">
                                {formatNullableMoney(h.totalPurchases)}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                                {h.paymentsReceived !== null && h.paymentsReceived !== undefined ? `+${formatMoney(h.paymentsReceived)}` : '—'}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-red-600 dark:text-red-400">
                                {formatNullableMoney(h.financeCharges)}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums">
                                {formatNullableMoney(h.feesAndCharges)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-sm">Loading statements...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : statements.length === 0 ? (
          <div className="text-center py-12 px-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto text-slate-400">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No statement history found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Statements accumulate automatically when ingested via file upload or Gmail automatic sync. Upload your statements in settings or verify your sync rules.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full sm:w-auto">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">Total Statements</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">{statements.length}</span>
                </div>
                {lastIngestionDate && (
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Last Ingested</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {formatDate(new Date(lastIngestionDate))}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-left sm:text-right text-slate-400 dark:text-slate-500 text-[11px] sm:text-xs">
                Sorted by period end date
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {statements.map((s) => {
                const hasCredits = s.totalCredits !== null && s.totalCredits !== undefined;
                const hasDebits = s.totalDebits !== null && s.totalDebits !== undefined;
                const netFlow = hasCredits || hasDebits ? (s.totalCredits ?? 0) - (s.totalDebits ?? 0) : null;
                const isNetPositive = netFlow !== null && netFlow >= 0;
                return (
                  <div key={s.id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-3 shadow-2xs">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                          {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-semibold">
                            {s.statementType === 'credit_card' ? 'Credit Card' : 'Bank Account'}
                          </span>
                          <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">
                            {s.source === 'file_upload' ? 'Upload' : s.source === 'gmail' ? 'Email' : s.source}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getVerdictBadge(s.verdict)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Opening</span>
                        <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {s.openingBalance !== null ? formatMoney(s.openingBalance) : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Closing</span>
                        <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {s.closingBalance !== null ? formatMoney(s.closingBalance) : '—'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Net Flow</span>
                        <span className={cn('font-mono tabular-nums font-semibold', isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                          {netFlow === null ? '—' : isNetPositive ? `+${formatMoney(netFlow)}` : formatMoney(netFlow)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{s.transactionCount !== null && s.transactionCount !== undefined ? `${s.transactionCount} transactions` : 'No transactions linked'}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 px-3 gap-1 rounded-xl font-medium"
                        onClick={() => handleSelectStatement(s.id)}
                      >
                        <span>View details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead className="text-right">Net Flow</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Txns</TableHead>
                    <TableHead>Verdict</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((s) => {
                    const hasCredits = s.totalCredits !== null && s.totalCredits !== undefined;
                    const hasDebits = s.totalDebits !== null && s.totalDebits !== undefined;
                    const netFlow = hasCredits || hasDebits ? (s.totalCredits ?? 0) - (s.totalDebits ?? 0) : null;
                    const isNetPositive = netFlow !== null && netFlow >= 0;
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            {s.statementType === 'credit_card' ? 'Credit Card' : 'Bank Account'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {s.openingBalance !== null ? formatMoney(s.openingBalance) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold">
                          {s.closingBalance !== null ? formatMoney(s.closingBalance) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {netFlow === null ? '—' : <span className={isNetPositive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                            {isNetPositive ? `+${formatMoney(netFlow)}` : formatMoney(netFlow)}
                          </span>}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            {s.source === 'file_upload' ? 'Upload' : s.source === 'gmail' ? 'Email' : s.source}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                          {s.transactionCount !== null && s.transactionCount !== undefined ? s.transactionCount : '—'}
                        </TableCell>
                        <TableCell>{getVerdictBadge(s.verdict)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => handleSelectStatement(s.id)}
                          >
                            <span>View details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Drill-down Dialog */}
        {selectedStatementId && (
          <Dialog open={!!selectedStatementId} onOpenChange={(val) => !val && setSelectedStatementId(null)}>
            <DialogContent className="sm:max-w-4xl sm:max-h-[85vh] max-h-[90vh] overflow-y-auto overflow-x-hidden w-full sm:w-full p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 pr-6 w-full min-w-0">
                  <span className="truncate max-w-full">Statement Details</span>
                  {selectedDetail && (
                    <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400 shrink-0">
                      {formatDate(selectedDetail.periodStart)} – {formatDate(selectedDetail.periodEnd)}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              {isLoadingDetail ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <span className="text-sm">Loading statement details and linked transactions...</span>
                </div>
              ) : detailError ? (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{detailError}</span>
                </div>
              ) : selectedDetail ? (
                <div className="space-y-6 pt-2 w-full max-w-full min-w-0">
                  {/* Metadata Header Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs w-full min-w-0">
                    <div className="min-w-0">
                      <span className="text-slate-400 dark:text-slate-500 block">Checksum Status</span>
                      <div className="flex items-center gap-1.5 mt-1 min-w-0">
                        {selectedDetail.checksumOk ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {selectedDetail.checksumOk ? 'SHA-256 Validated' : 'Checksum Warning'}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400 dark:text-slate-500 block">Parse Mode</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase mt-1 block truncate">
                        {selectedDetail.parseMode || 'STANDARD'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400 dark:text-slate-500 block">Chain Validation</span>
                      <div className="mt-1">
                        <Badge variant={selectedDetail.chainValidationPct !== null && selectedDetail.chainValidationPct >= 99 ? 'success' : 'warning'}>
                          {selectedDetail.chainValidationPct !== null ? `${selectedDetail.chainValidationPct.toFixed(1)}% Valid` : 'N/A'}
                        </Badge>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400 dark:text-slate-500 block">Ingestion Source</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block uppercase truncate">
                        {selectedDetail.source}
                      </span>
                    </div>
                  </div>

                  {/* Credit Card Details Grid (12 fields) */}
                  {selectedDetail.statementType === 'credit_card' && selectedDetail.cardDetails && (
                    <div className="space-y-2 w-full min-w-0">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Credit Card Summary
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 text-xs w-full min-w-0">
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Total Due</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white truncate block">
                            {formatNullableMoney(selectedDetail.cardDetails.totalAmountDue)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Min Due</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white truncate block">
                            {formatNullableMoney(selectedDetail.cardDetails.minimumAmountDue)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Due Date</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                            {selectedDetail.cardDetails.paymentDueDate ? formatDate(selectedDetail.cardDetails.paymentDueDate) : '—'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Credit Limit</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white truncate block">
                            {formatNullableMoney(selectedDetail.cardDetails.creditLimit)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Available Credit</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white truncate block">
                            {formatNullableMoney(selectedDetail.cardDetails.availableCreditLimit)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Finance Charges</span>
                          <span className="font-bold font-mono text-red-600 dark:text-red-400 truncate block">
                            {formatNullableMoney(selectedDetail.cardDetails.financeCharges)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Fees & Charges</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white truncate block">
                            {formatNullableMoney(selectedDetail.cardDetails.feesAndCharges)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Previous Balance</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white truncate block">
                            {formatNullableMoney(selectedDetail.cardDetails.previousBalance)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Payments Received</span>
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate block">
                            {formatNullableMoney(selectedDetail.cardDetails.paymentsReceived)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Total Purchases</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white truncate block">
                            {formatNullableMoney(selectedDetail.cardDetails.totalPurchases)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Reward Points Bal.</span>
                          <span className="font-bold font-mono text-amber-600 dark:text-amber-400 truncate block">
                            {selectedDetail.cardDetails.rewardPointsBalance !== null ? selectedDetail.cardDetails.rewardPointsBalance.toLocaleString() : '—'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-400 block text-[11px] truncate">Points Earned</span>
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate block">
                            {selectedDetail.cardDetails.rewardPointsEarned !== null ? `+${selectedDetail.cardDetails.rewardPointsEarned.toLocaleString()}` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Linked Transactions Table */}
                  <div className="space-y-2 w-full min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Linked Transactions ({selectedDetail.lines.length})
                      </h3>
                      {selectedDetail.linesSkipped > 0 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          {selectedDetail.linesSkipped} summary lines skipped during parse
                        </span>
                      )}
                    </div>

                    {selectedDetail.lines.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-xl w-full">
                        No transaction rows linked to this statement.
                      </div>
                    ) : (
                      <div className="space-y-3 w-full min-w-0">
                        {/* Mobile Card Stack View - No inner max-height so entire popup scrolls */}
                        <div className="md:hidden space-y-2.5 w-full min-w-0">
                          {selectedDetail.lines.map((line) => {
                            const isCredit = line.type === 'CREDIT';
                            return (
                              <div key={line.transactionId} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 space-y-2 text-xs shadow-2xs w-full min-w-0">
                                <div className="flex items-start justify-between gap-2 w-full min-w-0">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span className="font-mono text-slate-400 text-[10px] shrink-0 font-semibold">#{line.lineIndex + 1}</span>
                                    <span className="font-medium text-slate-900 dark:text-white break-words text-sm min-w-0" title={line.description}>
                                      {line.description}
                                    </span>
                                  </div>
                                  <span className={cn('font-mono tabular-nums font-bold shrink-0 text-sm ml-2', isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                    {isCredit ? `+${formatMoney(line.amount)}` : `-${formatMoney(line.amount)}`}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 text-[11px] w-full min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-slate-400 font-mono shrink-0">{formatDate(line.date)}</span>
                                    <div className="shrink-0">{getReviewTypeBadge(line.reviewType)}</div>
                                  </div>
                                  <div className="flex items-center gap-1.5 font-mono tabular-nums shrink-0">
                                    <span className="text-slate-400">Bal:</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                                      {line.balanceAfter !== null ? formatMoney(line.balanceAfter) : '—'}
                                    </span>
                                    {line.chainValid === null ? (
                                      <span className="text-slate-400 dark:text-slate-600">—</span>
                                    ) : line.chainValid ? (
                                      <span title="Chain continuity valid">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline-block" />
                                      </span>
                                    ) : (
                                      <span title="Chain continuity broken">
                                        <XCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 inline-block" />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Desktop Table View - No inner max-height so entire popup scrolls */}
                        <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto w-full">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Review Status</TableHead>
                                <TableHead className="text-right">Balance After</TableHead>
                                <TableHead className="text-center w-16">Chain</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedDetail.lines.map((line) => {
                                const isCredit = line.type === 'CREDIT';
                                return (
                                  <TableRow key={line.transactionId}>
                                    <TableCell className="font-mono text-xs text-slate-400">
                                      {line.lineIndex + 1}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-xs">
                                      {formatDate(line.date)}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium max-w-xs truncate" title={line.description}>
                                      {line.description}
                                    </TableCell>
                                    <TableCell className="text-right font-mono tabular-nums text-xs">
                                      <span className={isCredit ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                                        {isCredit ? `+${formatMoney(line.amount)}` : `-${formatMoney(line.amount)}`}
                                      </span>
                                    </TableCell>
                                    <TableCell>{getReviewTypeBadge(line.reviewType)}</TableCell>
                                    <TableCell className="text-right font-mono tabular-nums text-xs">
                                      {line.balanceAfter !== null ? formatMoney(line.balanceAfter) : '—'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {line.chainValid === null ? (
                                        <span className="text-slate-400 dark:text-slate-600">—</span>
                                      ) : line.chainValid ? (
                                        <span title="Chain continuity valid">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline-block" />
                                        </span>
                                      ) : (
                                        <span title="Chain continuity broken">
                                          <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 inline-block" />
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
