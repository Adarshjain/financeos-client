'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { toast } from 'sonner';

import { emitJobStarted } from '@/components/jobs/jobsBus';
import { useJobStatusPolling } from '@/components/jobs/useJobStatusPolling';
import { Broker as BrokerAccount } from '@/lib/account.types';
import { ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { ImportCommitResult, ReconciliationBroker } from '@/lib/types';

import {
  buildCasCommitRequest,
  buildInitialCasRowStates,
  buildInitialFnoRowStates,
  buildInitialReconcileRowStates,
  buildReconcileCommitRequest,
} from './importWizardHelpers';
import { getCasConfirmableCount, getConfirmableCount, getUnresolvedRows } from './types';
import { useImportWizardMutations } from './useImportWizardMutations';
import { useImportWizardState } from './useImportWizardState';

interface UseImportWizardProps {
  brokerAccounts: BrokerAccount[];
  onSuccess?: () => void;
}

export function useImportWizard({ brokerAccounts, onSuccess }: UseImportWizardProps) {
  const qc = useQueryClient();
  const {
    open,
    handleOpenChange,
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
  } = useImportWizardState();

  useJobStatusPolling<ImportCommitResult>(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED' && job.result) {
      setCommitResult(job.result);
      setStep(3);
      qc.invalidateQueries({ queryKey: keys.investments.all });
      qc.invalidateQueries({ queryKey: keys.accounts.all }); // broker balances derive from holdings
      onSuccess?.();
    } else if (job.status === 'FAILED') {
      toast.error(job.errorMessage || 'Commit failed.');
    } else if (job.status === 'CANCELLED') {
      toast.info('Import commit job was cancelled.');
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
        setRowStates(buildInitialReconcileRowStates(data.executions));
        setFnoRowStates(buildInitialFnoRowStates(data.fnoTrades));
        setStep(2);
      } else {
        // MF CAS
        if (!casFile) {
          toast.error('Please select a CAS PDF/CSV file.');
          setIsPreviewing(false);
          return;
        }

        const data = await previewImportMutation.mutateAsync({
          file: casFile,
          brokerAccountId,
          password: password || undefined,
        });
        setCasPreview(data);
        setRowStates(buildInitialCasRowStates(data.rows));
        setStep(2);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to preview import: ' + (err as Error).message
      );
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
          toast.info('Reconciliation commit job started in background.');
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
          toast.info('Import commit job started in background.');
        } else {
          setIsCommitting(false);
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to commit import');
      setIsCommitting(false);
    }
  };

  const selectedBroker = brokerAccounts.find((a) => a.id === brokerAccountId);
  const selectedBrokerName = selectedBroker ? `${selectedBroker.name} (${selectedBroker.provider})` : 'Broker';

  const unresolvedCount = getUnresolvedRows(reconcilePreview, rowStates).length;
  const confirmableCount = mode === 'mf_cas' ? getCasConfirmableCount(casPreview, rowStates) : getConfirmableCount(reconcilePreview, rowStates, fnoRowStates);

  return {
    open,
    handleOpenChange,
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
    confirmableCount,
    handlePreviewSubmit,
    handleCommitSubmit,
  };
}
