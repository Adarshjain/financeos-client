'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Upload,
  XCircle,
} from 'lucide-react';
import React, { JSX, useEffect, useState } from 'react';

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
import { StatementDetail, StatementSummary, StatementVerdict, ReviewType } from '@/lib/statement.types';
import { formatDate, formatMoney } from '@/lib/utils';

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

  useEffect(() => {
    if (open) {
      loadStatements();
    } else {
      setSelectedStatementId(null);
      setSelectedDetail(null);
    }
  }, [open, account.id]);

  const loadStatements = async () => {
    setIsLoading(true);
    setError(null);
    const res = await listStatementsByAccount(account.id);
    if (res.success && res.data) {
      setStatements(res.data);
    } else if (!res.success) {
      setError(res.error.message || 'Failed to load statements');
    }
    setIsLoading(false);
  };

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
        return <Badge variant="success">Auto Ingested</Badge>;
      case 'NEEDS_REVIEW':
        return <Badge variant="warning">Needs Review</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-5xl sm:max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-450" />
            Statements Archive — {account.name}
          </DialogTitle>
        </DialogHeader>

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
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-6">
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
              <div className="text-right text-slate-400 dark:text-slate-500">
                Sorted by period end date
              </div>
            </div>

            {/* List Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead className="text-right">Net Flow</TableHead>
                    <TableHead>Verdict</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((s) => {
                    const netFlow = (s.totalCredits ?? 0) - (s.totalDebits ?? 0);
                    const isNetPositive = netFlow >= 0;
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
                          <span className={isNetPositive ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                            {isNetPositive ? `+${formatMoney(netFlow)}` : formatMoney(netFlow)}
                          </span>
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
            <DialogContent className="sm:max-w-4xl sm:max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-between gap-2 pr-6">
                  <span>Statement Details</span>
                  {selectedDetail && (
                    <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
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
                <div className="space-y-6 pt-2">
                  {/* Metadata Header Box */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Checksum Status</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        {selectedDetail.checksumOk ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-450" />
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedDetail.checksumOk ? 'SHA-256 Validated' : 'Checksum Warning'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Parse Mode</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase mt-1 block">
                        {selectedDetail.parseMode || 'STANDARD'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Chain Validation</span>
                      <div className="mt-1">
                        <Badge variant={selectedDetail.chainValidationPct !== null && selectedDetail.chainValidationPct >= 99 ? 'success' : 'warning'}>
                          {selectedDetail.chainValidationPct !== null ? `${selectedDetail.chainValidationPct.toFixed(1)}% Valid` : 'N/A'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Ingestion Source</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block uppercase">
                        {selectedDetail.source}
                      </span>
                    </div>
                  </div>

                  {/* Credit Card Details Grid (12 fields) */}
                  {selectedDetail.statementType === 'credit_card' && selectedDetail.cardDetails && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Credit Card Summary
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Total Due</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            {formatMoney(selectedDetail.cardDetails.totalAmountDue)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Min Due</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            {formatMoney(selectedDetail.cardDetails.minimumAmountDue)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Due Date</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedDetail.cardDetails.paymentDueDate ? formatDate(selectedDetail.cardDetails.paymentDueDate) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Credit Limit</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            {formatMoney(selectedDetail.cardDetails.creditLimit)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Available Credit</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            {formatMoney(selectedDetail.cardDetails.availableCreditLimit)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Finance Charges</span>
                          <span className="font-bold font-mono text-red-600 dark:text-red-400">
                            {formatMoney(selectedDetail.cardDetails.financeCharges)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Fees & Charges</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            {formatMoney(selectedDetail.cardDetails.feesAndCharges)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Previous Balance</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            {formatMoney(selectedDetail.cardDetails.previousBalance)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Payments Received</span>
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {formatMoney(selectedDetail.cardDetails.paymentsReceived)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Total Purchases</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            {formatMoney(selectedDetail.cardDetails.totalPurchases)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Reward Points Bal.</span>
                          <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                            {selectedDetail.cardDetails.rewardPointsBalance !== null ? selectedDetail.cardDetails.rewardPointsBalance.toLocaleString() : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Points Earned</span>
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {selectedDetail.cardDetails.rewardPointsEarned !== null ? `+${selectedDetail.cardDetails.rewardPointsEarned.toLocaleString()}` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Linked Transactions Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
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
                      <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-xl">
                        No transaction rows linked to this statement.
                      </div>
                    ) : (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
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
                                      <span className="text-slate-350 dark:text-slate-600">—</span>
                                    ) : line.chainValid ? (
                                      <span title="Chain continuity valid">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-450 inline-block" />
                                      </span>
                                    ) : (
                                      <span title="Chain continuity broken">
                                        <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-450 inline-block" />
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
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
