'use server';

import { failuresApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import type { ApiResult } from '@/lib/types';

import { type EmailFilter, emailStatusParam, type FailureKind, FAILURES_PAGE_SIZE, STALE_MESSAGE } from './failuresModel';

/** A 409 means the item already left the failed state: say so plainly instead of the server's wording. */
async function plainConflict<T>(result: Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  const r = await result;
  if (!r.success && r.status === 409) return { ...r, error: { ...r.error, message: STALE_MESSAGE } };
  return r;
}

export const loadFailureSummary = createDomainAction(
  { fallbackError: "Couldn't load the failure counts. Try again." },
  async () => failuresApi.summary(),
);

export const loadFailedEmails = createDomainAction(
  { fallbackError: "Couldn't load the failed emails. Try again." },
  async (filter: EmailFilter, page: number) =>
    failuresApi.listGmail({ page, size: FAILURES_PAGE_SIZE, status: emailStatusParam(filter) }),
);

export const loadFailedJobs = createDomainAction(
  { fallbackError: "Couldn't load the failed jobs. Try again." },
  async (includeDismissed: boolean, page: number) =>
    failuresApi.listJobs({ page, size: FAILURES_PAGE_SIZE, includeDismissed }),
);

export const loadEmailDetail = createDomainAction(
  { fallbackError: "Couldn't load the details. Try again." },
  async (ledgerId: string) => failuresApi.getGmail(ledgerId),
);

export const loadJobDetail = createDomainAction(
  { fallbackError: "Couldn't load the details. Try again." },
  async (id: string) => failuresApi.getJob(id),
);

const retryEmailAction = createDomainAction(
  { fallbackError: "Couldn't retry that email. Try again." },
  async (ledgerId: string) => failuresApi.retryGmail(ledgerId),
);
export async function retryEmail(ledgerId: string) {
  return plainConflict(retryEmailAction(ledgerId));
}

const skipEmailAction = createDomainAction(
  { fallbackError: "Couldn't skip that email. Try again." },
  async (ledgerId: string, reason: string) => failuresApi.skipGmail(ledgerId, reason),
);
export async function skipEmail(ledgerId: string, reason: string) {
  return plainConflict(skipEmailAction(ledgerId, reason));
}

const retryJobAction = createDomainAction(
  { fallbackError: "Couldn't retry that job. Try again." },
  async (id: string) => failuresApi.retryJob(id),
);
export async function retryJob(id: string) {
  return plainConflict(retryJobAction(id));
}

const dismissJobAction = createDomainAction(
  { fallbackError: "Couldn't dismiss that job. Try again." },
  async (id: string, reason: string) => failuresApi.dismissJob(id, reason),
);
export async function dismissJob(id: string, reason: string) {
  return plainConflict(dismissJobAction(id, reason));
}

export const retryAllFailures = createDomainAction(
  { fallbackError: "Couldn't retry them. Try again." },
  async (kind: FailureKind) => failuresApi.retryAll(kind),
);
