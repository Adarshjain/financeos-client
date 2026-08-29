'use client';

import { FileSpreadsheet, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { commitImport, commitReconcileImport, previewImport, previewReconcileImport } from '@/actions/investments';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Broker as BrokerAccount } from '@/lib/account.types';
import {
  CommitFnoTradeDto,
  ImportCommitRequest,
  ImportCommitResult,
  ImportPreview,
  ReconcileCommitRequest,
  ReconcilePreview,
  ReconciliationBroker,
} from '@/lib/types';

import { ImportStep1Upload } from './import-wizard/ImportStep1Upload';
import { ImportStep2Review } from './import-wizard/ImportStep2Review';
import { ImportStep3Result } from './import-wizard/ImportStep3Result';
import {
  getCasConfirmableCount,
  getConfirmableCount,
  getUnresolvedRows,
  ImportAssetScope,
  ImportMode,
  RowState,
} from './import-wizard/types';

interface ImportWizardDialogProps {
  brokerAccounts: BrokerAccount[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

import { emitJobStarted } from '@/components/jobs/jobsBus';
import { useJobPolling } from '@/hooks/useJobPolling';

export function ImportWizardDialog({ brokerAccounts, trigger, onSuccess }: ImportWizardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form State
  const [mode, setMode] = useState<ImportMode>('reconcile_zerodha');
  const [assetScope, setAssetScope] = useState<ImportAssetScope>('all');
  const [brokerAccountId, setBrokerAccountId] = useState<string>('');
  const [password, setPassword] = useState('');

  // Reconcile Files
  const [taxpnlFiles, setTaxpnlFiles] = useState<File[]>([]);
  const [tradebookFiles, setTradebookFiles] = useState<File[]>([]);
  const [holdingsFile, setHoldingsFile] = useState<File | null>(null);

  // MF CAS Single File
  const [casFile, setCasFile] = useState<File | null>(null);

  const [isPreviewing, setIsPreviewing] = useState(false);

  // Step 2 Review State
  const [reconcilePreview, setReconcilePreview] = useState<ReconcilePreview | null>(null);
  const [casPreview, setCasPreview] = useState<ImportPreview | null>(null);
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});
  const [fnoRowStates, setFnoRowStates] = useState<Record<number, { skip: boolean }>>({});
  const [isCommitting, setIsCommitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Step 3 Result State
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);

  useJobPolling<ImportCommitResult>(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED' && job.result) {
      setCommitResult(job.result);
      setStep(3);
      onSuccess?.();
      router.refresh();
    } else if (job.status === 'FAILED') {
      toast.error(job.errorMessage || 'Commit failed.');
    } else if (job.status === 'CANCELLED') {
      toast.info('Import commit job was cancelled.');
    }
    setActiveJobId(null);
    setIsCommitting(false);
  });

  const resetWizard = () => {
    setStep(1);
    setAssetScope('all');
    setTaxpnlFiles([]);
    setTradebookFiles([]);
    setHoldingsFile(null);
    setCasFile(null);
    setPassword('');
    setReconcilePreview(null);
    setCasPreview(null);
    setRowStates({});
    setFnoRowStates({});
    setCommitResult(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetWizard();
    }
  };

  // Step 1: Preview Submission
  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerAccountId) {
      toast.error('Please select a target broker account.');
      return;
    }

    setIsPreviewing(true);
    try {
      if (mode === 'reconcile_zerodha' || mode === 'reconcile_groww') {
        const isFnoOnly = mode === 'reconcile_zerodha' && assetScope === 'fno';
        if (!isFnoOnly && tradebookFiles.length === 0) {
          toast.error('Please upload at least one Tradebook / Order History file.');
          setIsPreviewing(false);
          return;
        }
        if (taxpnlFiles.length === 0) {
          toast.error('Please upload at least one Tax P&L / Capital Gains file.');
          setIsPreviewing(false);
          return;
        }

        const formData = new FormData();
        const brokerName: ReconciliationBroker = mode === 'reconcile_zerodha' ? 'zerodha' : 'groww';
        formData.append('broker', brokerName);
        formData.append('brokerAccountId', brokerAccountId);
        if (mode === 'reconcile_zerodha') {
          formData.append('assetScope', assetScope);
        }

        tradebookFiles.forEach((f) => formData.append('tradebookFiles', f));
        taxpnlFiles.forEach((f) => formData.append('taxpnlFiles', f));
        if (holdingsFile) {
          formData.append('holdingsFile', holdingsFile);
        }

        const res = await previewReconcileImport(formData);
        if (res.success) {
          setReconcilePreview(res.data);
          const initialStates: Record<number, RowState> = {};
          for (const exec of res.data.executions) {
            initialStates[exec.rowIndex] = {
              skip: exec.isDuplicate,
              selectedInstrumentId: exec.matchedInstrument?.id,
              createNew: false,
              newInstrument: {
                type: 'stock',
                name: exec.symbol || 'New Instrument',
                symbol: exec.symbol || '',
                exchange: exec.exchange || 'NSE',
                isin: exec.isin || undefined,
                yahooSymbol: undefined,
              },
            };
          }
          setRowStates(initialStates);

          const initialFnoStates: Record<number, { skip: boolean }> = {};
          if (res.data.fnoTrades) {
            res.data.fnoTrades.forEach((trade, idx) => {
              initialFnoStates[idx] = { skip: trade.isDuplicate };
            });
          }
          setFnoRowStates(initialFnoStates);

          setStep(2);
        } else {
          toast.error(res.error.message);
        }
      } else {
        // MF CAS
        if (!casFile) {
          toast.error('Please select a CAS PDF/CSV file.');
          setIsPreviewing(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', casFile);
        formData.append('source', 'mf_cas');
        formData.append('brokerAccountId', brokerAccountId);
        if (password) {
          formData.append('password', password);
        }

        const res = await previewImport(formData);
        if (res.success) {
          setCasPreview(res.data);
          const initialStates: Record<number, RowState> = {};
          for (const row of res.data.rows) {
            initialStates[row.rowIndex] = {
              skip: row.duplicate || !!row.parsedRow?.error,
              selectedInstrumentId: row.matchedInstrument?.id,
              createNew: false,
              newInstrument: {
                type: 'mutual_fund',
                name: row.parsedRow.parsedName || row.parsedRow.parsedSymbol || 'New Mutual Fund',
                symbol: row.parsedRow.parsedSymbol || '',
                exchange: 'MUTUAL_FUND',
                isin: row.parsedRow.parsedIsin || undefined,
              },
            };
          }
          setRowStates(initialStates);
          setStep(2);
        } else {
          toast.error(res.error.message);
        }
      }
    } catch (err) {
      toast.error('Failed to preview import: ' + (err as Error).message);
    } finally {
      setIsPreviewing(false);
    }
  };

  // Step 2: Commit Submission
  const handleCommitSubmit = async () => {
    setIsCommitting(true);
    try {
      if (mode === 'reconcile_zerodha' || mode === 'reconcile_groww') {
        if (!reconcilePreview) return;
        const brokerName: ReconciliationBroker = mode === 'reconcile_zerodha' ? 'zerodha' : 'groww';

        const commitExecutions = reconcilePreview.executions.map((exec) => {
          const state = rowStates[exec.rowIndex] || { skip: false };
          return {
            rowIndex: exec.rowIndex,
            tradeDate: exec.tradeDate,
            type: exec.type,
            settlementType: exec.settlementType,
            symbol: exec.symbol,
            isin: exec.isin,
            exchange: exec.exchange,
            quantity: exec.quantity,
            price: exec.price,
            charges: exec.charges,
            externalRef: exec.externalRef,
            instrumentId: !state.createNew ? state.selectedInstrumentId || exec.matchedInstrument?.id : undefined,
            newInstrument: state.createNew ? state.newInstrument : undefined,
            skip: state.skip,
          };
        });

        const commitFnoTrades: CommitFnoTradeDto[] = (reconcilePreview.fnoTrades || []).map((trade, idx) => {
          const state = fnoRowStates[idx] || { skip: trade.isDuplicate };
          return {
            tradingSymbol: trade.tradingSymbol,
            underlyingSymbol: trade.underlyingSymbol,
            contractType: trade.contractType,
            optionType: trade.optionType,
            strikePrice: trade.strikePrice,
            expiryDate: trade.expiryDate,
            quantity: trade.quantity,
            buyValue: trade.buyValue,
            sellValue: trade.sellValue,
            totalCharges: trade.totalCharges,
            entryDate: trade.entryDate,
            exitDate: trade.exitDate,
            externalRef: trade.externalRef,
            skip: state.skip,
          };
        });

        const req: ReconcileCommitRequest = {
          broker: brokerName,
          brokerAccountId,
          executions: commitExecutions,
          classifications: reconcilePreview.classifications,
          fnoTrades: commitFnoTrades,
        };

        const res = await commitReconcileImport(req);
        if (res.success && res.data?.jobId) {
          const jobId = res.data.jobId;
          setActiveJobId(jobId);
          emitJobStarted(jobId);
          toast.info('Reconciliation commit job started in background.');
        } else if (!res.success) {
          toast.error(res.error.message);
          setIsCommitting(false);
        }
      } else {
        // CAS Commit
        if (!casPreview) return;
        const commitRows = casPreview.rows.map((row) => {
          const state = rowStates[row.rowIndex] || { skip: false };
          return {
            rowIndex: row.rowIndex,
            row: row.parsedRow,
            skip: state.skip,
            instrumentId: !state.createNew ? state.selectedInstrumentId || row.matchedInstrument?.id : undefined,
            newInstrument: state.createNew ? state.newInstrument : undefined,
          };
        });

        const req: ImportCommitRequest = {
          source: 'mf_cas',
          brokerAccountId,
          rows: commitRows,
        };

        const res = await commitImport(req);
        if (res.success && res.data?.jobId) {
          const jobId = res.data.jobId;
          setActiveJobId(jobId);
          emitJobStarted(jobId);
          toast.info('Import commit job started in background.');
        } else if (!res.success) {
          toast.error(res.error.message);
          setIsCommitting(false);
        }
      }
    } catch (err) {
      toast.error('Failed to commit import: ' + (err as Error).message);
      setIsCommitting(false);
    }
  };

  const selectedBroker = brokerAccounts.find((a) => a.id === brokerAccountId);
  const selectedBrokerName = selectedBroker ? `${selectedBroker.name} (${selectedBroker.provider})` : 'Broker';

  const unresolvedCount = getUnresolvedRows(reconcilePreview, rowStates).length;
  const confirmableCount =
    mode === 'mf_cas'
      ? getCasConfirmableCount(casPreview, rowStates)
      : getConfirmableCount(reconcilePreview, rowStates, fnoRowStates);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Upload className="w-3.5 h-3.5" />
            Bulk Import / Reconcile
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Investment Bulk Import
          </DialogTitle>
          <DialogDescription className="text-xs sr-only">
            Steps
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="p-4 sm:p-6">
          {step === 1 && (
            <ImportStep1Upload
              brokerAccounts={brokerAccounts}
              mode={mode}
              setMode={setMode}
              assetScope={assetScope}
              setAssetScope={setAssetScope}
              brokerAccountId={brokerAccountId}
              setBrokerAccountId={setBrokerAccountId}
              password={password}
              setPassword={setPassword}
              taxpnlFiles={taxpnlFiles}
              setTaxpnlFiles={setTaxpnlFiles}
              tradebookFiles={tradebookFiles}
              setTradebookFiles={setTradebookFiles}
              holdingsFile={holdingsFile}
              setHoldingsFile={setHoldingsFile}
              casFile={casFile}
              setCasFile={setCasFile}
              onSubmit={handlePreviewSubmit}
            />
          )}

          {step === 2 && (
            <ImportStep2Review
              reconcilePreview={reconcilePreview}
              casPreview={casPreview}
              rowStates={rowStates}
              setRowStates={setRowStates}
              fnoRowStates={fnoRowStates}
              setFnoRowStates={setFnoRowStates}
            />
          )}

          {step === 3 && commitResult && (
            <ImportStep3Result
              commitResult={commitResult}
              selectedBrokerName={selectedBrokerName}
            />
          )}
        </DialogBody>

        {step === 1 && (
          <DialogFooter
            primaryAction={{
              label: isPreviewing ? 'Reconciling & Parsing Files...' : 'Preview Reconciliation',
              type: 'submit',
              form: 'import-step1-form',
              variant: 'purple',
              disabled: isPreviewing,
            }}
            secondaryAction={{
              label: 'Cancel',
              disabled: isPreviewing,
            }}
          />
        )}

        {step === 2 && (
          <DialogFooter
            primaryAction={{
              label: isCommitting
                ? 'Importing Reconciled Executions...'
                : `Import Trades (${confirmableCount})`,
              onClick: handleCommitSubmit,
              disabled: isCommitting || unresolvedCount > 0,
            }}
            secondaryAction={{
              label: 'Back',
              onClick: () => setStep(1),
              disabled: isCommitting,
            }}
          />
        )}

        {step === 3 && commitResult && (
          <DialogFooter
            primaryAction={{
              label: 'Done & View Portfolio',
              variant: 'purple',
              onClick: () => handleOpenChange(false),
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
