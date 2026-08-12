'use client';

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { ReviewTypeBadge } from '@/components/statements/StatementBadges';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatementDetail } from '@/lib/statement.types';
import { cn, formatDate, formatMoney, formatNullableMoney } from '@/lib/utils';

export interface StatementDetailDialogProps {
  selectedStatementId: string | null;
  onClose: () => void;
  isLoadingDetail: boolean;
  detailError: string | null;
  selectedDetail: StatementDetail | null;
}

export function StatementDetailDialog({
  selectedStatementId,
  onClose,
  isLoadingDetail,
  detailError,
  selectedDetail,
}: StatementDetailDialogProps) {
  if (!selectedStatementId) return null;

  return (
    <Dialog open={!!selectedStatementId} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-4xl sm:max-h-[85vh] max-h-[90vh] overflow-y-auto overflow-x-hidden w-full sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 pr-6 w-full min-w-0">
            <span className="truncate max-w-full">Statement Details</span>
            {selectedDetail && (
              <span className="text-xs tabular-nums font-normal text-slate-500 dark:text-slate-400 shrink-0">
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
          <div className="space-y-3 pt-2 w-full max-w-full min-w-0">
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
                  <Badge
                    variant={selectedDetail.chainValidationPct !== null && selectedDetail.chainValidationPct >= 99 ? 'success' : 'warning'}>
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

            {/* Credit Card Details Grid */}
            {selectedDetail.statementType === 'credit_card' && selectedDetail.cardDetails && (
              <div className="space-y-2 w-full min-w-0">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Credit Card Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 text-xs w-full min-w-0">
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px] truncate">Total Due</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
                      {formatNullableMoney(selectedDetail.cardDetails.totalAmountDue)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px] truncate">Min Due</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
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
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
                      {formatNullableMoney(selectedDetail.cardDetails.creditLimit)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px] truncate">Available Credit</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
                      {formatNullableMoney(selectedDetail.cardDetails.availableCreditLimit)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px] truncate">Finance Charges</span>
                    <span className="font-bold tabular-nums text-red-600 dark:text-red-400 truncate block">
                      {formatNullableMoney(selectedDetail.cardDetails.financeCharges)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px] truncate">Fees & Charges</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
                      {formatNullableMoney(selectedDetail.cardDetails.feesAndCharges)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px] truncate">Previous Balance</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
                      {formatNullableMoney(selectedDetail.cardDetails.previousBalance)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px] truncate">Payments Received</span>
                    <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400 truncate block">
                      {formatNullableMoney(selectedDetail.cardDetails.paymentsReceived)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px] truncate">Total Purchases</span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white truncate block">
                      {formatNullableMoney(selectedDetail.cardDetails.totalPurchases)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px] truncate">Reward Points Bal.</span>
                    <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400 truncate block">
                      {selectedDetail.cardDetails.rewardPointsBalance !== null ? selectedDetail.cardDetails.rewardPointsBalance.toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[11px] truncate">Points Earned</span>
                    <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400 truncate block">
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
                  {/* Mobile Stack */}
                  <div className="md:hidden space-y-2.5 w-full min-w-0">
                    {selectedDetail.lines.map((line) => {
                      const isCredit = line.type === 'CREDIT';
                      return (
                        <div key={line.transactionId} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 space-y-2 text-xs shadow-2xs w-full min-w-0">
                          <div className="flex items-start justify-between gap-2 w-full min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="tabular-nums text-slate-400 text-[10px] shrink-0 font-semibold">#{line.lineIndex + 1}</span>
                              <span className="font-medium text-slate-900 dark:text-white break-words text-sm min-w-0" title={line.description}>
                                {line.description}
                              </span>
                            </div>
                            <span className={cn('tabular-nums font-bold shrink-0 text-sm ml-2', isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                              {isCredit ? `+${formatMoney(line.amount)}` : `-${formatMoney(line.amount)}`}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 text-[11px] w-full min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-slate-400 tabular-nums shrink-0">{formatDate(line.date)}</span>
                              <div className="shrink-0"><ReviewTypeBadge reviewType={line.reviewType} /></div>
                            </div>
                            <div className="flex items-center gap-1.5 tabular-nums shrink-0">
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

                  {/* Desktop Table */}
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
                              <TableCell className="tabular-nums text-xs text-slate-400">
                                {line.lineIndex + 1}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs">
                                {formatDate(line.date)}
                              </TableCell>
                              <TableCell className="text-xs font-medium max-w-xs truncate" title={line.description}>
                                {line.description}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
                                <span className={isCredit ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                                  {isCredit ? `+${formatMoney(line.amount)}` : `-${formatMoney(line.amount)}`}
                                </span>
                              </TableCell>
                              <TableCell><ReviewTypeBadge reviewType={line.reviewType} /></TableCell>
                              <TableCell className="text-right tabular-nums text-xs">
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
  );
}
