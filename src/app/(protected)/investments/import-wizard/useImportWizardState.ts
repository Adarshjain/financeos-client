'use client';

import { useState } from 'react';

import { ImportCommitResult, ImportPreview, ReconcilePreview } from '@/lib/types';

import { ImportAssetScope, ImportMode, RowState } from './types';

// All the wizard's local state (step 1 form fields, step 2 review state, step
// 3 result), plus the two state-only actions (reset, open/close) that don't
// need the mutations or job-status wiring living in useImportWizard.ts.
export function useImportWizardState() {
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
  };
}
