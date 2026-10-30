'use client';

import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Card } from '@/components/ds/Card/Card';
import { DropZone } from '@/components/ds/DropZone/DropZone';
import { Select } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';

import { EPF_ACCEPT } from './epfImportModel';
import { MODE_OPTIONS, queuedFile } from './importModel';
import type { ImportMode } from './types';
import type { useEpfImport } from './useEpfImport';

export const EPF_UPLOAD_FORM_ID = 'import-epf-form';

/** Step 1 for the EPFO passbook: the type, then the PDFs; refused files show what the server said. */
export function EpfUploadStep({ epf, mode, onModeChange }: { epf: ReturnType<typeof useEpfImport>; mode: ImportMode; onModeChange: (mode: ImportMode) => void }) {
  const { files, isPreviewing, uploadError, queueError, refusedAll } = epf;
  return (
    <form id={EPF_UPLOAD_FORM_ID} onSubmit={epf.handlePreviewSubmit} className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card title="What are you importing?">
        <div className="flex flex-col gap-space-8 desk:gap-space-16 p-space-16 desk:p-space-20">
          <Select label="Type" options={MODE_OPTIONS} value={mode} onValueChange={(v) => onModeChange(v as ImportMode)} disabled={isPreviewing} />
          {uploadError ? (
            <Banner tone="danger" action={isPreviewing ? undefined : { label: 'Choose another file', onSelect: epf.clearFiles }}>
              {uploadError}
            </Banner>
          ) : null}
          {refusedAll ? (
            <Banner tone="danger" action={isPreviewing ? undefined : { label: 'Choose other files', onSelect: epf.clearFiles }}>
              {refusedAll.map((r, i) => (
                <Text key={`${i}-${r.fileName}`} variant="body" as="div">{`${r.fileName}: ${r.message}`}</Text>
              ))}
            </Banner>
          ) : null}
          {queueError ? <Banner tone="danger">{queueError}</Banner> : null}
          <DropZone
            title="Drop your EPFO passbook PDFs"
            hint="Download them from passbook.epfindia.gov.in or the UMANG app. Add every member ID and year at once."
            buttonLabel="Choose files"
            multiple
            accept={EPF_ACCEPT}
            disabled={isPreviewing}
            data-testid="epf-zone"
            onFilesSelected={epf.addFiles}
            queuedFiles={files.map(queuedFile)}
            onRemoveFile={(f) => epf.removeFile(Number(f.id.split('-')[0]))}
          />
        </div>
      </Card>
    </form>
  );
}
