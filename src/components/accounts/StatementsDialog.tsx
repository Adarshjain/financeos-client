'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import { JSX, useCallback, useEffect, useRef, useState } from 'react';

import { getCardCycleSummary } from '@/actions/accounts';
import { getStatementDetail, listStatementsByAccount } from '@/actions/statements';
import {
  ReviewTypeBadge,
  StatementVerdictBadge,
} from '@/components/statements/StatementBadges';
import { StatementDetailDialog } from '@/components/statements/StatementDetailDialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Account } from '@/lib/account.types';
import { StatementDetail, StatementSummary } from '@/lib/statement.types';
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
  const [cardSummaryError, setCardSummaryError] = useState<string | null>(null);
  /** Monotonic id so only the newest statement-detail response is applied. */
  const detailRequestIdRef = useRef(0);

  const loadStatements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCardSummaryError(null);

    const isCard = account.type === AccountType.CREDIT_CARD;
    if (isCard) setIsLoadingCardSummary(true);

    // These two requests are independent (both keyed only on the account) but
    // were previously awaited in sequence, roughly doubling dialog-open latency
    // for credit cards.
    const [statementsRes, summaryRes] = await Promise.all([
      listStatementsByAccount(account.id),
      isCard ? getCardCycleSummary(account.id) : Promise.resolve(null),
    ]);

    if (statementsRes.success && statementsRes.data) {
      setStatements(statementsRes.data);
    } else if (!statementsRes.success) {
      setError(statementsRes.error.message || 'Failed to load statements');
    }
    setIsLoading(false);

    if (isCard && summaryRes) {
      if (summaryRes.success && summaryRes.data) {
        setCardSummary(summaryRes.data);
      } else {
        setCardSummary(null);
        // Previously swallowed, so a failed request rendered as "No active
        // statement summary available" — absence of data rather than an error.
        if (!summaryRes.success) setCardSummaryError(summaryRes.error.message);
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

    // Guard against out-of-order responses: clicking row A then row B could
    // otherwise let A's slower response land last and render A's detail while
    // the header still shows B as selected.
    const requestId = ++detailRequestIdRef.current;
    const res = await getStatementDetail(statementId);
    if (requestId !== detailRequestIdRef.current) return;

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-5xl sm:max-h-[85vh] overflow-y-auto space-y-1 p-4">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div className="flex flex-col items-start">
              <div className="text-slate-400 dark:text-slate-500 text-sm">Statements Archive</div>
              <div>{account.name}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Card Cycle Summary Card for Credit Cards */}
        {account.type === AccountType.CREDIT_CARD && (
          <div className="space-y-1 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Card Cycle Summary</h3>
              </div>
              {cardSummary?.periodEnd && (
                <span className="text-xs text-slate-500 tabular-nums">
                  Statement Date: {formatDate(cardSummary.periodEnd)}
                </span>
              )}
            </div>

            {isLoadingCardSummary ? (
              <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span className="text-xs">Loading card cycle summary...</span>
              </div>
            ) : cardSummaryError ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs">
                <span className="text-destructive">
                  Couldn&apos;t load the card cycle summary: {cardSummaryError}
                </span>
                <button
                  type="button"
                  onClick={() => loadStatements()}
                  className="font-semibold text-destructive underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            ) : !cardSummary || !cardSummary.statementId ? (
              <div className="text-center py-4 text-xs text-slate-400">
                No active statement summary available for this credit card.
              </div>
            ) : (
              /* Hero Metric & Secondary Grid */
              <div
                className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-slate-50/70 dark:bg-slate-950/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                <div
                  className="md:col-span-1 space-y-1 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Total Amount Due</span>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {formatNullableMoney(cardSummary.totalAmountDue)}
                  </div>
                  {cardSummary.daysUntilDue !== null && cardSummary.daysUntilDue !== undefined ? (
                    <div className="pt-1">
                      {cardSummary.daysUntilDue > 0 ? (
                        <Badge variant={cardSummary.daysUntilDue <= 3 ? 'warning' : 'secondary'}
                               className="text-[10px]">
                          Due in {cardSummary.daysUntilDue} days
                        </Badge>
                      ) : cardSummary.daysUntilDue === 0 ? (
                        <Badge variant="warning" className="text-[10px] bg-amber-500 text-white">
                          Due today
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          {Math.abs(cardSummary.daysUntilDue)} days overdue
                        </Badge>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block">Minimum Due</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-1 block tabular-nums">
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
                    <span className="font-bold text-amber-600 dark:text-amber-400 mt-1 block tabular-nums">
                      {cardSummary.rewardPointsBalance !== null && cardSummary.rewardPointsBalance !== undefined
                        ? cardSummary.rewardPointsBalance.toLocaleString()
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400 dark:text-slate-500">
                      <span>Utilization</span>
                      <span
                        className={cn('font-bold tabular-nums', cardSummary.utilizationPct !== null && cardSummary.utilizationPct !== undefined ? (cardSummary.utilizationPct < 30 ? 'text-emerald-600 dark:text-emerald-400' : cardSummary.utilizationPct < 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400') : 'text-slate-700 dark:text-slate-300')}>
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
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-sm">Loading statements...</span>
          </div>
        ) : error ? (
          <div
            className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : statements.length === 0 ? (
          <div
            className="text-center py-12 px-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div
              className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto text-slate-400">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No statement history found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Statements accumulate automatically when ingested via file upload or Gmail automatic sync. Upload your
                statements in settings or verify your sync rules.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary Banner */}
            {lastIngestionDate && (
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full sm:w-auto text-sm">
                <span className="text-slate-400 dark:text-slate-500 block">Last Ingested</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatDate(new Date(lastIngestionDate))}
                </span>
              </div>
            )}

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3 pr-1">
              {statements.map((s) => {
                return (
                  <div key={s.id}
                       className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-3 shadow-2xs">
                    <div
                      className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                          {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[10px] uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">
                            {s.source === 'file_upload' ? 'Upload' : s.source === 'gmail' ? 'Email' : s.source}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatementVerdictBadge verdict={s.verdict} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Opening</span>
                        <span className="tabular-nums text-slate-700 dark:text-slate-300">
                          {s.openingBalance !== null ? formatMoney(s.openingBalance) : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Closing</span>
                        <span className="tabular-nums font-bold text-slate-900 dark:text-white">
                          {s.closingBalance !== null ? formatMoney(s.closingBalance) : '—'}
                        </span>
                      </div>
                      {/*<div className="text-right">*/}
                      {/*  <span className="text-[10px] text-slate-400 block">Net Flow</span>*/}
                      {/*  <span className={cn('tabular-nums font-semibold', isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>*/}
                      {/*    {netFlow === null ? '—' : isNetPositive ? `+${formatMoney(netFlow)}` : formatMoney(netFlow)}*/}
                      {/*  </span>*/}
                      {/*</div>*/}
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
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Txns</TableHead>
                    <TableHead>Verdict</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((s) => {
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-xs uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            {s.statementType === 'credit_card' ? 'Credit Card' : 'Bank Account'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.openingBalance !== null ? formatMoney(s.openingBalance) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {s.closingBalance !== null ? formatMoney(s.closingBalance) : '—'}
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-xs uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                            {s.source === 'file_upload' ? 'Upload' : s.source === 'gmail' ? 'Email' : s.source}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                          {s.transactionCount !== null && s.transactionCount !== undefined ? s.transactionCount : '—'}
                        </TableCell>
                        <TableCell><StatementVerdictBadge verdict={s.verdict} /></TableCell>
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

        <StatementDetailDialog
          selectedStatementId={selectedStatementId}
          onClose={() => setSelectedStatementId(null)}
          isLoadingDetail={isLoadingDetail}
          detailError={detailError}
          selectedDetail={selectedDetail}
        />
      </DialogContent>
    </Dialog>
  );
}

