'use client';

import React from 'react';

import { Banner, Card, DropZone, Select, TextField } from '@/components/ds';
import { AccountPicker } from '@/components/organisms';
import { type Broker, isAccountClosed } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import {
  CAS_ACCEPT,
  HOLDINGS_ACCEPT,
  isFnoOnly,
  MODE_OPTIONS,
  queuedFile,
  reconcileCopy,
  reconcileNote,
  SCOPE_OPTIONS,
  TAX_ACCEPT,
} from './importModel';
import type { ImportAssetScope, ImportMode } from './types';
import type { useImportWizard } from './useImportWizard';

const BROKER_TYPES: readonly AccountType[] = [AccountType.BROKER];

export const UPLOAD_FORM_ID = 'import-step1-form';

type Wizard = ReturnType<typeof useImportWizard>;

/** Adds files to a queue, skipping one that is already in it. */
const addFiles = (current: File[], added: File[]) => [
  ...current,
  ...added.filter((f) => !current.some((c) => c.name === f.name && c.size === f.size && c.lastModified === f.lastModified)),
];

/** Step 1: broker, target account and scope, then the files that kind of import takes. */
export function UploadStep({ wizard, brokers }: { wizard: Wizard; brokers: Broker[] }) {
  const { mode, assetScope, brokerAccountId, isPreviewing } = wizard;
  const fnoOnly = isFnoOnly(mode, assetScope);
  const reconcile = mode === 'reconcile_zerodha' || mode === 'reconcile_groww';
  const copy = reconcileCopy(mode);
  const note = reconcileNote(fnoOnly);

  return (
    <form id={UPLOAD_FORM_ID} onSubmit={wizard.handlePreviewSubmit} className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card>
        <div className="flex flex-col gap-space-8 desk:gap-space-16 p-space-16 desk:p-space-20">
          <div className={`grid grid-cols-1 gap-x-space-12 gap-y-space-8 desk:gap-space-16 ${mode === 'reconcile_zerodha' ? 'desk:grid-cols-3' : 'desk:grid-cols-2'}`}>
            <Select
              label="Broker / import type"
              options={MODE_OPTIONS}
              value={mode}
              onValueChange={(v) => wizard.setMode(v as ImportMode)}
              disabled={isPreviewing}
            />
            <AccountPicker
              label="Target broker account"
              placeholder="Select target account…"
              accounts={brokers.filter((b) => !isAccountClosed(b) || b.id === brokerAccountId)}
              types={BROKER_TYPES}
              value={brokerAccountId || null}
              onValueChange={(v) => wizard.setBrokerAccountId(v ?? '')}
              disabled={isPreviewing}
            />
            {mode === 'reconcile_zerodha' ? (
              <Select
                label="Asset scope"
                options={SCOPE_OPTIONS}
                value={assetScope}
                onValueChange={(v) => wizard.setAssetScope(v as ImportAssetScope)}
                disabled={isPreviewing}
              />
            ) : null}
          </div>

          {reconcile ? (
            <Banner tone="info" title={note.lead}>
              {note.body}
            </Banner>
          ) : null}

          {reconcile ? (
            <div className="flex flex-col gap-space-8 desk:gap-space-16">
              <div className={`grid grid-cols-1 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16 ${fnoOnly ? '' : 'desk:grid-cols-2'}`}>
                <Card variant="inset" title={copy.taxTitle} subtitle="Per FY files" data-testid="taxpnl-zone">
                  <div className="p-space-10">
                    <DropZone
                      title={copy.taxZone}
                      hint="XLSX or XLS"
                      buttonLabel="Choose files"
                      accept={TAX_ACCEPT}
                      disabled={isPreviewing}
                      onFilesSelected={(files) => wizard.setTaxpnlFiles(addFiles(wizard.taxpnlFiles, files))}
                      queuedFiles={wizard.taxpnlFiles.map(queuedFile)}
                      onRemoveFile={(f) => wizard.setTaxpnlFiles(wizard.taxpnlFiles.filter((_, i) => i !== Number(f.id.split('-')[0])))}
                    />
                  </div>
                </Card>
                {fnoOnly ? null : (
                  <Card variant="inset" title={copy.tradebookTitle} subtitle="Full history CSV/XLSX" data-testid="tradebook-zone">
                    <div className="p-space-10">
                      <DropZone
                        title={copy.tradebookZone}
                        hint={mode === 'reconcile_zerodha' ? 'CSV' : 'XLSX, XLS or CSV'}
                        buttonLabel="Choose files"
                        accept={copy.tradebookAccept}
                        disabled={isPreviewing}
                        onFilesSelected={(files) => wizard.setTradebookFiles(addFiles(wizard.tradebookFiles, files))}
                        queuedFiles={wizard.tradebookFiles.map(queuedFile)}
                        onRemoveFile={(f) =>
                          wizard.setTradebookFiles(wizard.tradebookFiles.filter((_, i) => i !== Number(f.id.split('-')[0])))
                        }
                      />
                    </div>
                  </Card>
                )}
              </div>
              {fnoOnly ? null : (
                <Card
                  variant="inset"
                  title="3. Holdings snapshot anchor (optional)"
                  subtitle="Kite / Groww Holdings export CSV/XLSX"
                  data-testid="holdings-zone"
                >
                  <div className="p-space-10">
                    <DropZone
                      title="Upload optional Demat Holdings Snapshot file"
                      hint="To anchor & validate open lots · CSV, XLSX or XLS"
                      buttonLabel="Choose file"
                      multiple={false}
                      accept={HOLDINGS_ACCEPT}
                      disabled={isPreviewing}
                      onFilesSelected={(files) => wizard.setHoldingsFile(files[0] ?? null)}
                      queuedFiles={wizard.holdingsFile ? [queuedFile(wizard.holdingsFile, 0)] : []}
                      onRemoveFile={() => wizard.setHoldingsFile(null)}
                    />
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-space-8 desk:gap-space-16">
              <TextField
                type="password"
                label="CAS PDF password"
                placeholder="Enter CAS PDF password (usually your PAN)"
                value={wizard.password}
                onChange={(e) => wizard.setPassword(e.target.value)}
                disabled={isPreviewing}
                autoComplete="off"
              />
              <Card variant="inset" title="Upload CAS statement file" data-testid="cas-zone">
                <div className="p-space-10">
                  <DropZone
                    title="Choose CAMS / KFintech CAS PDF/CSV file"
                    hint="PDF or CSV"
                    buttonLabel="Choose file"
                    multiple={false}
                    accept={CAS_ACCEPT}
                    disabled={isPreviewing}
                    onFilesSelected={(files) => wizard.setCasFile(files[0] ?? null)}
                    queuedFiles={wizard.casFile ? [queuedFile(wizard.casFile, 0)] : []}
                    onRemoveFile={() => wizard.setCasFile(null)}
                  />
                </div>
              </Card>
            </div>
          )}
        </div>
      </Card>
    </form>
  );
}
