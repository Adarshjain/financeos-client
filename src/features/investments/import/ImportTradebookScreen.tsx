'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, Card, Stepper } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import type { Broker } from '@/lib/account.types';

import { HOLDINGS_HREF } from '../investmentsTabs';
import { TRADEBOOK_HREF } from '../tradebook/tradebookModel';
import { importableCount } from './epfImportModel';
import { EpfResultStep } from './EpfResultStep';
import { EpfReviewStep } from './EpfReviewStep';
import { EPF_UPLOAD_FORM_ID, EpfUploadStep } from './EpfUploadStep';
import { IMPORT_STEPS } from './importModel';
import { dineroImportNotify } from './notify';
import { ResultStep } from './ResultStep';
import { ReviewStep } from './ReviewStep';
import type { ImportMode } from './types';
import { UPLOAD_FORM_ID, UploadStep } from './UploadStep';
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
  if (mode === 'epf_passbook') return <EpfScreen wizard={wizard} epf={epf} />;
  return <TradebookScreen brokers={brokers} wizard={wizard} />;
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

/** The EPFO passbook import: one PDF, its entries, and the result. */
function EpfScreen({ wizard, epf }: { wizard: Wizard; epf: ReturnType<typeof useEpfImport> }) {
  const { step, isPreviewing, isCommitting, preview, result } = epf;
  const nothingNew = preview ? importableCount(preview) === 0 : true;
  return (
    <ShellPage crumb="Grow / Investments" title="Import tradebook" backHref={TRADEBOOK_HREF}>
      <div className="mx-auto flex max-w-container-xl flex-col gap-space-12 desk:gap-space-16">
        <Card title="Investment bulk import">
          <div className="px-space-16 pb-space-16 desk:px-space-20 desk:pb-space-20">
            <Stepper steps={IMPORT_STEPS} current={step - 1} />
          </div>
        </Card>

        {step === 1 ? <EpfUploadStep epf={epf} mode={wizard.mode} onModeChange={wizard.setMode} /> : null}
        {step === 2 ? <EpfReviewStep epf={epf} mode={wizard.mode} onModeChange={wizard.setMode} /> : null}
        {step === 3 && result ? (
          <>
            <RefreshWhenDone />
            <EpfResultStep result={result} />
          </>
        ) : null}

        <div className="flex justify-end gap-space-8">
          {step === 1 ? (
            <>
              <Button asChild variant="link" className="max-desk:flex-1" disabled={isPreviewing}>
                <Link href={TRADEBOOK_HREF}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                form={EPF_UPLOAD_FORM_ID}
                variant="primary"
                className="max-desk:flex-1"
                loading={isPreviewing}
                disabled={isPreviewing || !epf.file}
              >
                {isPreviewing ? 'Reading passbook…' : 'Preview passbook'}
              </Button>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <Button type="button" variant="link" className="max-desk:flex-1" disabled={isCommitting || isPreviewing} onClick={() => epf.setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                className="max-desk:flex-1"
                loading={isCommitting}
                disabled={isCommitting || isPreviewing || nothingNew}
                onClick={epf.commit}
              >
                {isCommitting ? 'Importing entries…' : `Import ${preview ? importableCount(preview) : 0} entries`}
              </Button>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <Button type="button" variant="secondary" className="max-desk:flex-1" onClick={epf.reset}>
                Import another
              </Button>
              <Button asChild variant="primary" className="max-desk:flex-1">
                <Link href={EPF_HREF}>Open EPF</Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </ShellPage>
  );
}

function TradebookScreen({ brokers, wizard }: { brokers: Broker[]; wizard: Wizard }) {
  const { step, mode, isPreviewing, isCommitting, commitResult } = wizard;
  const blocked = (mode === 'mf_cas' ? wizard.casUnresolvedCount : wizard.unresolvedCount) > 0;

  return (
    <ShellPage crumb="Grow / Investments" title="Import tradebook" backHref={TRADEBOOK_HREF}>
      <div className="mx-auto flex max-w-container-xl flex-col gap-space-12 desk:gap-space-16">
        <Card title="Investment bulk import">
          <div className="px-space-16 pb-space-16 desk:px-space-20 desk:pb-space-20">
            <Stepper steps={IMPORT_STEPS} current={step - 1} />
          </div>
        </Card>

        {step === 1 ? <UploadStep wizard={wizard} brokers={brokers} /> : null}
        {step === 2 ? <ReviewStep wizard={wizard} /> : null}
        {step === 3 && commitResult ? <ResultStep result={commitResult} brokerName={wizard.selectedBrokerName} /> : null}

        <div className="flex justify-end gap-space-8">
          {step === 1 ? (
            <>
              <Button asChild variant="link" className="max-desk:flex-1" disabled={isPreviewing}>
                <Link href={TRADEBOOK_HREF}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                form={UPLOAD_FORM_ID}
                variant="primary"
                className="max-desk:flex-1"
                loading={isPreviewing}
                disabled={isPreviewing}
              >
                {isPreviewing ? 'Reconciling & parsing files…' : 'Preview reconciliation'}
              </Button>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <Button type="button" variant="link" className="max-desk:flex-1" disabled={isCommitting} onClick={() => wizard.setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                className="max-desk:flex-1"
                loading={isCommitting}
                disabled={isCommitting || blocked}
                onClick={wizard.handleCommitSubmit}
              >
                {isCommitting ? 'Importing reconciled executions…' : `Import trades (${wizard.confirmableCount})`}
              </Button>
            </>
          ) : null}
          {step === 3 ? (
            <Button asChild variant="primary" className="max-desk:flex-1">
              <Link href={HOLDINGS_HREF}>Done & view portfolio</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </ShellPage>
  );
}
