'use client';

import Link from 'next/link';
import React from 'react';

import { Button, Card, Stepper } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';
import type { Broker } from '@/lib/account.types';

import { HOLDINGS_HREF } from '../investmentsTabs';
import { TRADEBOOK_HREF } from '../tradebook/tradebookModel';
import { IMPORT_STEPS } from './importModel';
import { dineroImportNotify } from './notify';
import { ResultStep } from './ResultStep';
import { ReviewStep } from './ReviewStep';
import { UPLOAD_FORM_ID, UploadStep } from './UploadStep';
import { useImportWizard } from './useImportWizard';

/**
 * /investments/import: the Zerodha, Groww and mutual-fund CAS import as its own page.
 * Upload files, Review (include or skip each row, map instruments), then the Result of the import job.
 */
export function ImportTradebookScreen({ brokers }: { brokers: Broker[] }) {
  const wizard = useImportWizard({ brokerAccounts: brokers, notify: dineroImportNotify });
  const { step, mode, isPreviewing, isCommitting, commitResult } = wizard;
  const blocked = (mode === 'mf_cas' ? wizard.casUnresolvedCount : wizard.unresolvedCount) > 0;

  return (
    <ShellPage crumb="Grow / Investments" title="Import tradebook" backHref={TRADEBOOK_HREF}>
      <div className="mx-auto flex max-w-container-xl flex-col gap-space-8 desk:gap-space-16">
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
