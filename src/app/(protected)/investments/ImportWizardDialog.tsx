'use client';

import { FileSpreadsheet, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { commitImport, commitReconcileImport, previewImport, previewReconcileImport } from '@/actions/investments';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Broker as BrokerAccount } from '@/lib/account.types';
import {
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
import { ImportAssetScope, ImportMode, RowState } from './import-wizard/types';

interface ImportWizardDialogProps {
  brokerAccounts: BrokerAccount[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ImportWizardDialog({ brokerAccounts, trigger, onSuccess }: ImportWizardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form State
  const [mode, setMode] = useState<ImportMode>('reconcile_zerodha');
  const [assetScope, setAssetScope] = useState<ImportAssetScope>('all');
  const [brokerAccountId, setBrokerAccountId] = useState(brokerAccounts[0]?.id || '');
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
  const [isCommitting, setIsCommitting] = useState(false);

  // Step 3 Result State
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);

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
            const isFno = exec.suggestedType === 'future' || exec.suggestedType === 'option';
            initialStates[exec.rowIndex] = {
              skip: exec.isDuplicate,
              selectedInstrumentId: exec.matchedInstrument?.id,
              createNew: isFno ? !exec.matchedInstrument : false,
              newInstrument: isFno
                ? {
                    type: exec.suggestedType!,
                    name: exec.tradingSymbol || exec.symbol || 'New Contract',
                    symbol: exec.symbol || '',
                    exchange: exec.exchange || 'NSE',
                    tradingSymbol: exec.tradingSymbol || exec.symbol,
                    underlyingSymbol: exec.underlyingSymbol,
                    expiryDate: exec.expiryDate,
                    optionType: exec.optionType,
                    strikePrice: exec.strikePrice !== undefined && exec.strikePrice !== null ? String(exec.strikePrice) : undefined,
                    lotSize: exec.lotSize,
                    isin: undefined,
                    yahooSymbol: undefined,
                  }
                : {
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

        const req: ReconcileCommitRequest = {
          broker: brokerName,
          brokerAccountId,
          executions: commitExecutions,
          classifications: reconcilePreview.classifications,
        };

        const res = await commitReconcileImport(req);
        if (res.success) {
          setCommitResult(res.data);
          setStep(3);
          onSuccess?.();
          router.refresh();
        } else {
          toast.error(res.error.message);
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
        if (res.success) {
          setCommitResult(res.data);
          setStep(3);
          onSuccess?.();
          router.refresh();
        } else {
          toast.error(res.error.message);
        }
      }
    } catch (err) {
      toast.error('Failed to commit import: ' + (err as Error).message);
    } finally {
      setIsCommitting(false);
    }
  };

  const selectedBrokerName = brokerAccounts.find((b) => b.id === brokerAccountId)?.name || 'Broker';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 text-xs flex items-center">
            <Upload className="w-3.5 h-3.5" />
            Import Broker Trades
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl max-h-[99vh] flex flex-col p-2 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Broker Import Reconciliation
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Step {step} of 3:{' '}
            {step === 1
              ? 'Select Broker & Upload Files'
              : step === 2
                ? 'Reconciliation Review & Open Holdings'
                : 'Import Complete'}
          </DialogDescription>
        </DialogHeader>

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
            isPreviewing={isPreviewing}
            onSubmit={handlePreviewSubmit}
          />
        )}

        {step === 2 && (
          <ImportStep2Review
            mode={mode}
            reconcilePreview={reconcilePreview}
            casPreview={casPreview}
            rowStates={rowStates}
            setRowStates={setRowStates}
            isCommitting={isCommitting}
            onBack={() => setStep(1)}
            onCommit={handleCommitSubmit}
          />
        )}

        {step === 3 && commitResult && (
          <ImportStep3Result
            commitResult={commitResult}
            selectedBrokerName={selectedBrokerName}
            onDone={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
