'use client';

import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { multipartBodySerializer } from '@/lib/api/multipart';

import type { EpfImportResult, EpfPreview } from './epfImportModel';

interface EpfImportInput {
  file: File;
  /** The employer the passbook is filed under; absent for a new one. */
  employerId?: string;
}

/** The EPF passbook import's two calls: read the PDF, then add its entries. */
export function useEpfImportMutations() {
  const previewMutation = useMutation({
    mutationFn: (input: EpfImportInput) =>
      api
        .POST('/api/v1/epf/import/preview', {
          params: { query: { employerId: input.employerId } },
          body: { file: input.file },
          bodySerializer: multipartBodySerializer,
        })
        .then((r) => r.data! as EpfPreview),
  });
  const commitMutation = useMutation({
    mutationFn: (input: EpfImportInput) =>
      api
        .POST('/api/v1/epf/import/commit', {
          params: { query: { employerId: input.employerId } },
          body: { file: input.file },
          bodySerializer: multipartBodySerializer,
        })
        .then((r) => r.data! as EpfImportResult),
  });
  return { previewMutation, commitMutation };
}
