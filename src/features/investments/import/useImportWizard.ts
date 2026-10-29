'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { toast } from 'sonner';

import { emitJobStarted } from '@/features/jobs/jobsBus';
import { useJobStatusPolling } from '@/features/jobs/useJobStatusPolling';
import { Broker as BrokerAccount } from '@/lib/account.types';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import { ImportCommitResult, ReconciliationBroker } from '@/lib/types';

import {
  buildCasCommitRequest,
  buildInitialCasRowStates,
  buildInitialFnoRowStates,
  buildInitialReconcileRowStates,
  buildReconcileCommitRequest,
} from './importWizardHelpers';
import { getCasConfirmableCount, getCasUnresolvedRows, getConfirmableCount, getUnresolvedRows, type ImportMode } from './types';
import { useImportWizardMutations } from './useImportWizardMutations';
import { useImportWizardState } from './useImportWizardState';

/** How the wizard tells the user things. Defaults to the Legacy toaster; Dinero pages pass their own. */
export interface ImportWizardNotify {
  error: (message: string) => void;
  info: (message: string) => void;
  /** A thrown error; `fallback` names what failed ("Couldn't commit import"). */
  caught: (error: unknown, fallback: string) => void;
}

export const legacyImportNotify: ImportWizardNotify = {
  error: (message) => void toast.error(message),
  info: (message) => void toast.info(message),
  caught: (error, fallback) => toastError(error, fallback),
};

interface UseImportWizardProps {
  brokerAccounts: BrokerAccount[];
  onSuccess?: () => void;
  notify?: ImportWizardNotify;
  /** The import type the page opens with. */
  initialMode?: ImportMode;
}

export function useImportWizard({ brokerAccounts, onSuccess, notify = legacyImportNotify, initialMode }: UseImportWizardProps) {
  const qc = useQueryClient();
  const {
    open,
    handleOpenChange,
    resetWizard,
    step,
    setStep,
    mode,
    setMode,
    assetScope,
    setAssetScope,
    brokerAccountId,
    setBrokerAccountId,
    password,
    setPassword,
    taxpnlFiles,
    setTaxpnlFiles,
    tradebookFiles,
    setTradebookFiles,
    holdingsFile,
    setHoldingsFile,
    casFile,
    setCasFile,
    isPreviewing,
    setIsPreviewing,
    reconcilePreview,
    setReconcilePreview,
    casPreview,
    setCasPreview,
    rowStates,
    setRowStates,
    fnoRowStates,
    setFnoRowStates,
    isCommitting,
    setIsCommitting,
    activeJobId,
    setActiveJobId,
    commitResult,
    setCommitResult,
  } = useImportWizardState(initialMode);

  useJobStatusPolling<ImportCommitResult>(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED' && job.result) {
      setCommitResult(job.result);
      setStep(3);
      invalidateInvestmentQueries(qc);
      qc.invalidateQueries({ queryKey: keys.accounts.all }); // broker balances derive from holdings
      onSuccess?.();
    } else if (job.status === 'FAILED') {
      notify.error(job.errorMessage || "Couldn't commit the import. Try again.");
    } else if (job.status === 'CANCELLED') {
      notify.info('Import cancelled');
    }
    setActiveJobId(null);
    setIsCommitting(false);
  });

  const {
    previewImportMutation,
    previewReconcileMutation,
    commitImportMutation,
    commitReconcileMutation,
  } = useImportWizardMutations();

  // Step 1: Preview Submission
  /** The upload form's submit, or the action bar's Preview (no event). */
  const handlePreviewSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!brokerAccountId) {
      notify.error('Select a target broker account.');
      return;
    }

    setIsPreviewing(true);
    try {
      if (mode === 'reconcile_zerodha' || mode === 'reconcile_groww') {
        const isFnoOnly = mode === 'reconcile_zerodha' && assetScope === 'fno';
        if (!isFnoOnly && tradebookFiles.length === 0) {
          notify.error('Upload at least one Tradebook / Order History file.');
          setIsPreviewing(false);
          return;
        }
        if (taxpnlFiles.length === 0) {
          notify.error('Upload at least one Tax P&L / Capital Gains file.');
          setIsPreviewing(false);
          return;
        }

        const brokerName: ReconciliationBroker = mode === 'reconcile_zerodha' ? 'zerodha' : 'groww';

        const data = await previewReconcileMutation.mutateAsync({
          broker: brokerName,
          brokerAccountId,
          assetScope: mode === 'reconcile_zerodha' ? assetScope : undefined,
          tradebookFiles,
          taxpnlFiles,
          holdingsFile,
        });
        setReconcilePreview(data);
        setCasPreview(null);
        setRowStates(buildInitialReconcileRowStates(data.executions));
        setFnoRowStates(buildInitialFnoRowStates(data.fnoTrades));
        setStep(2);
      } else {
        // MF CAS
        if (!casFile) {
          notify.error('Select a CAS PDF/CSV file.');
          setIsPreviewing(false);
          return;
        }

        const data = await previewImportMutation.mutateAsync({
          file: casFile,
          brokerAccountId,
          password: password || undefined,
        });
        setCasPreview(data);
        setReconcilePreview(null);
        setRowStates(buildInitialCasRowStates(data.rows));
        setStep(2);
      }
    } catch (err) {
      notify.caught(err, "Couldn't preview import");
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

        const req = buildReconcileCommitRequest({
          broker: brokerName,
          brokerAccountId,
          reconcilePreview,
          rowStates,
          fnoRowStates,
        });

        const data = await commitReconcileMutation.mutateAsync(req);
        if (data?.jobId) {
          setActiveJobId(data.jobId);
          emitJobStarted(data.jobId);
          notify.info('Reconciliation started');
        } else {
          setIsCommitting(false);
        }
      } else {
        // CAS Commit
        if (!casPreview) return;
        const req = buildCasCommitRequest({ brokerAccountId, casPreview, rowStates });

        const data = await commitImportMutation.mutateAsync(req);
        if (data?.jobId) {
          setActiveJobId(data.jobId);
          emitJobStarted(data.jobId);
          notify.info('Import started');
        } else {
          setIsCommitting(false);
        }
      }
    } catch (err) {
      notify.caught(err, "Couldn't commit import");
      setIsCommitting(false);
    }
  };

  const selectedBroker = brokerAccounts.find((a) => a.id === brokerAccountId);
  const selectedBrokerName = selectedBroker ? `${selectedBroker.name} (${selectedBroker.provider})` : 'Broker';

  const unresolvedCount = getUnresolvedRows(reconcilePreview, rowStates).length;
  const casUnresolvedCount = getCasUnresolvedRows(casPreview, rowStates).length;
  const confirmableCount = mode === 'mf_cas' ? getCasConfirmableCount(casPreview, rowStates) : getConfirmableCount(reconcilePreview, rowStates, fnoRowStates);

  return {
    open,
    handleOpenChange,
    resetWizard,
    step,
    setStep,
    mode,
    setMode,
    assetScope,
    setAssetScope,
    brokerAccountId,
    setBrokerAccountId,
    password,
    setPassword,
    taxpnlFiles,
    setTaxpnlFiles,
    tradebookFiles,
    setTradebookFiles,
    holdingsFile,
    setHoldingsFile,
    casFile,
    setCasFile,
    isPreviewing,
    reconcilePreview,
    casPreview,
    rowStates,
    setRowStates,
    fnoRowStates,
    setFnoRowStates,
    isCommitting,
    commitResult,
    selectedBrokerName,
    unresolvedCount,
    casUnresolvedCount,
    confirmableCount,
    handlePreviewSubmit,
    handleCommitSubmit,
  };
}
