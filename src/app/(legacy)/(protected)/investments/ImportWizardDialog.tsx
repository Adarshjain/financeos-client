'use client';

import { FileSpreadsheet, Upload } from 'lucide-react';
import React from 'react';

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
import { Broker as BrokerAccount, isAccountOfType } from '@/lib/account.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { AccountType } from '@/lib/types';

import { ImportStep1Upload } from './import-wizard/ImportStep1Upload';
import { ImportStep2Review } from './import-wizard/ImportStep2Review';
import { ImportStep3Result } from './import-wizard/ImportStep3Result';
import { useImportWizard } from './import-wizard/useImportWizard';

interface ImportWizardDialogProps {
  brokerAccounts?: BrokerAccount[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ImportWizardDialog({
  brokerAccounts: propBrokerAccounts,
  trigger,
  onSuccess,
}: ImportWizardDialogProps = {}) {
  const { data: accounts = [] } = useAccounts();
  const brokerAccounts =
    propBrokerAccounts ?? accounts.filter(isAccountOfType(AccountType.BROKER));

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
  } = useImportWizard({
    brokerAccounts,
    onSuccess,
  });

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
              label: isPreviewing
                ? 'Reconciling & Parsing Files...'
                : 'Preview Reconciliation',
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
