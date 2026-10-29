'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Card, SelectionBar, Stepper } from '@/components/ds';
import { subCrumb } from '@/features/shell/navigation';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import type { Broker } from '@/lib/account.types';

import { HOLDINGS_HREF } from '../investmentsTabs';
import { TRADEBOOK_HREF } from '../tradebook/tradebookModel';
import { importableTotal } from './epfImportModel';
import { EpfResultStep } from './EpfResultStep';
import { EpfReviewStep } from './EpfReviewStep';
import { EpfUploadStep } from './EpfUploadStep';
import { IMPORT_STEPS } from './importModel';
import { dineroImportNotify } from './notify';
import { ResultStep } from './ResultStep';
import { ReviewStep } from './ReviewStep';
import type { ImportMode } from './types';
import { UploadStep } from './UploadStep';
import { useEpfImport } from './useEpfImport';
import { useImportWizard } from './useImportWizard';

/**
 * /investments/import: the Zerodha, Groww and mutual-fund CAS import as its own page.
 * Upload files, Review (include or skip each row, map instruments), then the Result of the import job.
 */
export function ImportTradebookScreen({ brokers, initialMode }: { brokers: Broker[]; initialMode?: ImportMode }) {
  const wizard = useImportWizard({ brokerAccounts: brokers, notify: dineroImportNotify, initialMode });
  const epf = useEpfImport(dineroImportNotify);
  const { mode } = wizard;
  // A new import type starts clean: no files, preview or result from the one before.
  const changeMode = (next: ImportMode) => {
    if (next === mode) return;
    wizard.resetWizard();
    epf.reset();
    wizard.setMode(next);
  };
  if (mode === 'epf_passbook') return <EpfScreen wizard={wizard} epf={epf} onModeChange={changeMode} />;
  return <TradebookScreen brokers={brokers} wizard={wizard} onModeChange={changeMode} />;
}

type Wizard = ReturnType<typeof useImportWizard>;

const EPF_HREF = appHref('/investments/epf');

/** Once the entries are in, drops the router's cached pages so Open EPF shows them. Mounted for the EPF import only. */
function RefreshWhenDone() {
  const router = useRouter();
  React.useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}

/** The EPFO passbook import: the PDFs, their entries, and the result. */
function EpfScreen({ wizard, epf, onModeChange }: { wizard: Wizard; epf: ReturnType<typeof useEpfImport>; onModeChange: (mode: ImportMode) => void }) {
  const { step, isPreviewing, isCommitting, preview, result } = epf;
  const importable = preview ? importableTotal(preview.sections) : 0;
  const nothingNew = importable === 0;
  const several = epf.files.length > 1;
  const router = useRouter();
  return (
    <ShellPage crumb={subCrumb('investments')} title="Import tradebook" backHref={TRADEBOOK_HREF}>
      <div className="mx-auto flex max-w-container-md flex-col gap-space-8 desk:gap-space-16 pb-space-48">
        <Card title="Investment bulk import">
          <div className="px-space-16 pb-space-16 desk:px-space-20 desk:pb-space-20">
            <Stepper steps={IMPORT_STEPS} current={step - 1} />
          </div>
        </Card>

        {step === 1 ? <EpfUploadStep epf={epf} mode={wizard.mode} onModeChange={onModeChange} /> : null}
        {step === 2 ? <EpfReviewStep epf={epf} mode={wizard.mode} onModeChange={onModeChange} /> : null}
        {step === 3 && result ? (
          <>
            <RefreshWhenDone />
            <EpfResultStep result={result} />
          </>
        ) : null}

        <SelectionBar
          className="fixed inset-x-0 bottom-0 desk:bottom-safe-12"
          actions={
            step === 1
              ? [
                  { id: 'cancel', label: 'Cancel', variant: 'link', disabled: isPreviewing, onSelect: () => router.push(TRADEBOOK_HREF) },
                  {
                    id: 'preview',
                    label: isPreviewing ? (several ? 'Reading passbooks…' : 'Reading passbook…') : several ? 'Preview passbooks' : 'Preview passbook',
                    variant: 'primary',
                    loading: isPreviewing,
                    disabled: isPreviewing || epf.files.length === 0,
                    onSelect: () => epf.handlePreviewSubmit(),
                  },
                ]
              : step === 2
                ? [
                    { id: 'back', label: 'Back', variant: 'link', disabled: isCommitting || isPreviewing, onSelect: () => epf.setStep(1) },
                    {
                      id: 'import',
                      label: isCommitting ? 'Importing entries…' : `Import ${importable} entries`,
                      variant: 'primary',
                      loading: isCommitting,
                      disabled: isCommitting || isPreviewing || nothingNew,
                      onSelect: () => void epf.commit(),
                    },
                  ]
                : [
                    { id: 'another', label: 'Import another', variant: 'secondary', onSelect: epf.reset },
                    { id: 'open', label: 'Open EPF', variant: 'primary', onSelect: () => router.push(EPF_HREF) },
                  ]
          }
        />
      </div>
    </ShellPage>
  );
}

function TradebookScreen({ brokers, wizard, onModeChange }: { brokers: Broker[]; wizard: Wizard; onModeChange: (mode: ImportMode) => void }) {
  const { step, mode, isPreviewing, isCommitting, commitResult } = wizard;
  const blocked = (mode === 'mf_cas' ? wizard.casUnresolvedCount : wizard.unresolvedCount) > 0;
  const router = useRouter();

  return (
    <ShellPage crumb={subCrumb('investments')} title="Import tradebook" backHref={TRADEBOOK_HREF}>
      <div className="mx-auto flex max-w-container-md flex-col gap-space-8 desk:gap-space-16 pb-space-48">
        <Card title="Investment bulk import">
          <div className="px-space-16 pb-space-16 desk:px-space-20 desk:pb-space-20">
            <Stepper steps={IMPORT_STEPS} current={step - 1} />
          </div>
        </Card>

        {step === 1 ? <UploadStep wizard={wizard} brokers={brokers} onModeChange={onModeChange} /> : null}
        {step === 2 ? <ReviewStep wizard={wizard} /> : null}
        {step === 3 && commitResult ? <ResultStep result={commitResult} brokerName={wizard.selectedBrokerName} /> : null}

        <SelectionBar
          className="fixed inset-x-0 bottom-0 desk:bottom-safe-12"
          actions={
            step === 1
              ? [
                  { id: 'cancel', label: 'Cancel', variant: 'link', disabled: isPreviewing, onSelect: () => router.push(TRADEBOOK_HREF) },
                  {
                    id: 'preview',
                    label: isPreviewing ? 'Reconciling & parsing files…' : 'Preview reconciliation',
                    variant: 'primary',
                    loading: isPreviewing,
                    disabled: isPreviewing,
                    onSelect: () => void wizard.handlePreviewSubmit(),
                  },
                ]
              : step === 2
                ? [
                    { id: 'back', label: 'Back', variant: 'link', disabled: isCommitting, onSelect: () => wizard.setStep(1) },
                    {
                      id: 'import',
                      label: isCommitting ? 'Importing reconciled executions…' : `Import trades (${wizard.confirmableCount})`,
                      variant: 'primary',
                      loading: isCommitting,
                      disabled: isCommitting || blocked,
                      onSelect: () => void wizard.handleCommitSubmit(),
                    },
                  ]
                : [{ id: 'done', label: 'Done & view portfolio', variant: 'primary', onSelect: () => router.push(HOLDINGS_HREF) }]
          }
        />
      </div>
    </ShellPage>
  );
}
