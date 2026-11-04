'use server';

import { serverApi } from '@/lib/api/server';
import type { HeldUpload } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type { FileIngestionResult, JobResponse } from '@/lib/types';

/** Statement files that wait for an account. */
export const listHeldUploads = createDomainAction(
  { fallbackError: "Couldn't load the files that need an account. Try again." },
  async (): Promise<HeldUpload[]> => {
    const { data } = await serverApi.GET('/api/v1/held-uploads');
    return (data ?? []) as HeldUpload[];
  },
);

/** Imports a held file into an account. A password problem comes back as a 422 with its code. */
export const assignHeldUpload = createDomainAction(
  { fallbackError: "Couldn't import the file. Try again." },
  async (id: string, accountId: string, password?: string): Promise<FileIngestionResult> => {
    const { data } = await serverApi.POST('/api/v1/held-uploads/{id}/assign', {
      params: { path: { id } },
      body: { accountId, password: password || undefined },
    });
    return data as FileIngestionResult;
  },
);

export const deleteHeldUpload = createDomainAction(
  { fallbackError: "Couldn't remove the file. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/held-uploads/{id}', { params: { path: { id } } });
  },
);

/** Runs one file of a finished import again with its password; returns the new job. */
export const retryFileWithPassword = createDomainAction(
  { fallbackError: "Couldn't try the file again. Try again." },
  async (jobId: string, fileIndex: number, password: string, saveToAccount: boolean): Promise<JobResponse> => {
    const { data } = await serverApi.POST('/api/v1/jobs/{jobId}/files/{fileIndex}/password', {
      params: { path: { jobId, fileIndex } },
      body: { password, saveToAccount },
    });
    return data as JobResponse;
  },
);
