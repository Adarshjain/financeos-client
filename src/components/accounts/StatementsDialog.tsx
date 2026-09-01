'use client';

import { AlertCircle, FileText, Loader2, Upload } from 'lucide-react';
import { JSX } from 'react';

import { StatementDetailDialog } from '@/components/statements/StatementDetailDialog';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { formatDate } from '@/lib/utils';

import { CardCycleSummaryCard } from './statements-dialog/CardCycleSummaryCard';
import { StatementsDesktopTable } from './statements-dialog/StatementsDesktopTable';
import { StatementsMobileList } from './statements-dialog/StatementsMobileList';
import { useStatementsDialog } from './statements-dialog/useStatementsDialog';

interface StatementsDialogProps {
  account: Account;
  trigger: JSX.Element;
}

export function StatementsDialog({ account, trigger }: StatementsDialogProps) {
  const {
    open,
    handleOpenChange,
    statements,
    isLoading,
    error,
    selectedStatementId,
    setSelectedStatementId,
    selectedDetail,
    isLoadingDetail,
    detailError,
    cardSummary,
    isLoadingCardSummary,
    cardSummaryError,
    lastIngestionDate,
    loadStatements,
    handleSelectStatement,
  } = useStatementsDialog(account);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-4">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div className="flex flex-col items-start">
              <div className="text-slate-400 dark:text-slate-500 text-sm">Statements Archive</div>
              <div>{account.name}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-1">
          {/* Card Cycle Summary Card for Credit Cards */}
          {account.type === AccountType.CREDIT_CARD && (
            <CardCycleSummaryCard
              cardSummary={cardSummary}
              isLoadingCardSummary={isLoadingCardSummary}
              cardSummaryError={cardSummaryError}
              onRetry={loadStatements}
            />
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-sm">Loading statements...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center gap-2 text-sm">
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
                  Statements accumulate automatically when ingested via file upload or Gmail automatic
                  sync. Upload your statements in settings or verify your sync rules.
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
              <StatementsMobileList
                statements={statements}
                onSelectStatement={handleSelectStatement}
              />

              {/* Desktop Table View */}
              <StatementsDesktopTable
                statements={statements}
                onSelectStatement={handleSelectStatement}
              />
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
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
