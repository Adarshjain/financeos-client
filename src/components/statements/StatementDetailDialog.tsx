'use client';

import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateRange, formatDateRangeFull } from '@/lib/date-range';
import { StatementDetail } from '@/lib/statement.types';

import { DeleteStatementDialog } from './delete/DeleteStatementDialog';
import { StatementCreditCardSummary } from './detail/StatementCreditCardSummary';
import { StatementLinkedTransactions } from './detail/StatementLinkedTransactions';
import { StatementMetadataHeader } from './detail/StatementMetadataHeader';

export interface StatementDetailDialogProps {
  accountId: string;
  selectedStatementId: string | null;
  onClose: () => void;
  isLoadingDetail: boolean;
  detailError: string | null;
  selectedDetail: StatementDetail | null;
  /** The statement was deleted; the caller closes this dialog. */
  onDeleted: () => void;
}

export function StatementDetailDialog({
  accountId,
  selectedStatementId,
  onClose,
  isLoadingDetail,
  detailError,
  selectedDetail,
  onDeleted,
}: StatementDetailDialogProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
              <span
                className="text-xs tabular-nums font-normal text-slate-500 dark:text-slate-400 shrink-0"
                title={formatDateRangeFull(selectedDetail.periodStart, selectedDetail.periodEnd)}
              >
                {formatDateRange(selectedDetail.periodStart, selectedDetail.periodEnd)}
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

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="destructive-outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete statement
                </Button>
              </div>

              <DeleteStatementDialog
                accountId={accountId}
                statementId={selectedDetail.id}
                source={selectedDetail.source}
                periodLabel={formatDateRange(selectedDetail.periodStart, selectedDetail.periodEnd)}
                open={confirmingDelete}
                onOpenChange={setConfirmingDelete}
                onDeleted={onDeleted}
              />
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
