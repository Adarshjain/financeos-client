'use client';

import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { multipartBodySerializer } from '@/lib/api/multipart';

import type { EpfBatchPreview, EpfBatchResult } from './epfImportModel';

interface EpfImportInput {
  files: File[];
  /** "<sectionKey>=<employerId>" for each passbook group filed under an existing employer; absent for new ones. */
  assign?: string[];
}

/** The EPF passbook import's two calls: read the PDFs, then add their entries. */
export function useEpfImportMutations() {
  const previewMutation = useMutation({
    mutationFn: (input: EpfImportInput) =>
      api
        .POST('/api/v1/epf/import/batch/preview', {
          params: { query: { assign: input.assign?.length ? input.assign : undefined } },
          body: { files: input.files },
          bodySerializer: multipartBodySerializer,
        })
        .then((r) => r.data! as EpfBatchPreview),
  });
  const commitMutation = useMutation({
    mutationFn: (input: EpfImportInput) =>
      api
        .POST('/api/v1/epf/import/batch/commit', {
          params: { query: { assign: input.assign?.length ? input.assign : undefined } },
          body: { files: input.files },
          bodySerializer: multipartBodySerializer,
        })
        .then((r) => r.data! as EpfBatchResult),
  });
  return { previewMutation, commitMutation };
}
