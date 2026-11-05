'use client';

import { useMutation } from '@tanstack/react-query';

// The statement PDFs go up as multipart on the browser client: server actions cap bodies at 1 MB.
import { api } from '@/lib/api/client';
import { multipartBodySerializer } from '@/lib/api/multipart';

import type { NpsImportCommitRequest, NpsImportResult, NpsPreview } from '../nps/npsImportModel';

/** The NPS statement import's two calls: read one PDF (with a password when asked), then add its entries. */
export function useNpsImportMutations() {
  const previewMutation = useMutation({
    mutationFn: (input: { file: File; password?: string }) =>
      api
        .POST('/api/v1/nps/import/preview', {
          params: { query: { password: input.password || undefined } },
          body: { file: input.file as never },
          bodySerializer: multipartBodySerializer,
        })
        .then((r) => r.data as NpsPreview),
  });
  const commitMutation = useMutation({
    mutationFn: (body: NpsImportCommitRequest) => api.POST('/api/v1/nps/import/commit', { body }).then((r) => r.data as NpsImportResult),
  });
  return { previewMutation, commitMutation };
}
