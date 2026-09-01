'use client';

import { AlertCircle, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatementDetail } from '@/lib/statement.types';
import { formatDate } from '@/lib/utils';

import { StatementCreditCardSummary } from './detail/StatementCreditCardSummary';
import { StatementLinkedTransactions } from './detail/StatementLinkedTransactions';
import { StatementMetadataHeader } from './detail/StatementMetadataHeader';

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
    <Dialog
      open={!!selectedStatementId}
      onOpenChange={(val) => !val && onClose()}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 pr-6 w-full min-w-0">
            <span className="truncate max-w-full">Statement Details</span>
            {selectedDetail && (
              <span className="text-xs tabular-nums font-normal text-slate-500 dark:text-slate-400 shrink-0">
                {formatDate(selectedDetail.periodStart)} –{' '}
                {formatDate(selectedDetail.periodEnd)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="overflow-x-hidden">
          {isLoadingDetail ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-sm">
                Loading statement details and linked transactions...
              </span>
            </div>
          ) : detailError ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{detailError}</span>
            </div>
          ) : selectedDetail ? (
            <div className="space-y-3 pt-2 w-full max-w-full min-w-0">
              <StatementMetadataHeader selectedDetail={selectedDetail} />

              {selectedDetail.statementType === 'credit_card' &&
                selectedDetail.cardDetails && (
                  <StatementCreditCardSummary
                    cardDetails={selectedDetail.cardDetails}
                  />
                )}

              <StatementLinkedTransactions
                lines={selectedDetail.lines}
                linesSkipped={selectedDetail.linesSkipped}
              />
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
