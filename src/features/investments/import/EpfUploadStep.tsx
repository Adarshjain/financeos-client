'use client';

import React from 'react';

import { Banner, Card, DropZone, Select } from '@/components/ds';

import { EPF_ACCEPT } from './epfImportModel';
import { MODE_OPTIONS,queuedFile } from './importModel';
import type { ImportMode } from './types';
import type { useEpfImport } from './useEpfImport';

export const EPF_UPLOAD_FORM_ID = 'import-epf-form';

/** Step 1 for the EPFO passbook: the type, then the one PDF; a refused file shows what the server said. */
export function EpfUploadStep({ epf, mode, onModeChange }: { epf: ReturnType<typeof useEpfImport>; mode: ImportMode; onModeChange: (mode: ImportMode) => void }) {
  const { file, isPreviewing, uploadError } = epf;
  return (
    <form id={EPF_UPLOAD_FORM_ID} onSubmit={epf.handlePreviewSubmit} className="flex flex-col gap-space-12 desk:gap-space-16">
      <Card title="What are you importing?">
        <div className="flex flex-col gap-space-16 p-space-16 desk:p-space-20">
          <Select label="Type" options={MODE_OPTIONS} value={mode} onValueChange={(v) => onModeChange(v as ImportMode)} disabled={isPreviewing} />
          {uploadError ? (
            <Banner tone="danger" action={isPreviewing ? undefined : { label: 'Choose another file', onSelect: () => epf.pickFile(null) }}>
              {uploadError}
            </Banner>
          ) : null}
          <DropZone
            title="Drop your EPFO passbook PDF"
            hint="Download it from passbook.epfindia.gov.in or the UMANG app. One PDF per member ID; upload one for each employer."
            buttonLabel="Choose file"
            multiple={false}
            accept={EPF_ACCEPT}
            disabled={isPreviewing}
            data-testid="epf-zone"
            onFilesSelected={(files) => epf.pickFile(files[0] ?? null)}
            queuedFiles={file ? [queuedFile(file, 0)] : []}
            onRemoveFile={() => epf.pickFile(null)}
          />
        </div>
      </Card>
    </form>
  );
}
