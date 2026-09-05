/**
 * Gmail / Google SSO seed helpers. Google itself is WireMock — see `../google-stubs.ts`.
 */
import { randomUUID } from 'node:crypto';

import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient, JobResponse } from '../api';
import { expectStatus, makeApi, waitForJob } from '../api';
import { E2E_API_URL, E2E_WIREMOCK_URL } from '../config';
import type { ScriptResponseEntry } from '../control';
import { scriptLlm } from '../control';
import type { GoogleIdentity, MailMessage } from '../google-stubs';
import { mailId } from '../google-stubs';

export type GmailConnectionResponse = components['schemas']['GmailConnectionResponse'];
export type GmailSenderRequest = components['schemas']['GmailSenderRequest'];
export type GmailSenderResponse = components['schemas']['GmailSenderResponse'];
export type GmailAttentionItemResponse = components['schemas']['GmailAttentionItemResponse'];
export type UserResponse = components['schemas']['UserResponse'];

/** `GmailIngestionService.SyncSummary`, the GMAIL_SYNC job result. */
export interface SyncSummary {
  discovered: number;
  processed: number;
  created: number;
  reconciled: number;
  skipped: number;
  parked: number;
  failedRetryable: number;
  failedPermanent: number;
  backlogRemaining: number;
}

export const GOOGLE_AUTH_URL = `${E2E_WIREMOCK_URL}/google/o/oauth2/v2/auth`;
export const SSO_REDIRECT_URI = 'http://localhost:6970/auth/google/callback';
export const GMAIL_REDIRECT_URI = 'http://localhost:6969/api/v1/gmail/oauth/callback';
export const SETTINGS_GMAIL_URL = 'http://localhost:6970/settings/gmail';
/** The allow-listed bank sender every synthetic mail comes from. */
export const BANK_SENDER = 'alerts@e2ebank.test';
export const BANK_SENDER_NAME = 'E2E Bank Alerts';

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export function isoDaysAgo(n: number): string {
  return daysAgo(n).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Google SSO (API level)
// ---------------------------------------------------------------------------

export function ssoState(): string {
  const alnum = Math.random().toString(36).slice(2, 10).padEnd(8, 'x');
  return `${alnum}.${randomUUID()}`;
}

export interface SsoCallbackResult {
  status: number;
  user?: UserResponse;
  cookie?: string;
  error?: { code?: string; message?: string };
}

/** Plays Google's redirect into the server callback (what the client page's server action does). */
export async function ssoCallback(
  params: { code?: string; state?: string; error?: string }
): Promise<SsoCallbackResult> {
  const url = new URL(`${E2E_API_URL}/api/v1/auth/google/callback`);
  if (params.code !== undefined) url.searchParams.set('code', params.code);
  url.searchParams.set('state', params.state ?? ssoState());
  if (params.error !== undefined) url.searchParams.set('error', params.error);
  const res = await fetch(url, { redirect: 'manual' });
  const text = await res.text();
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  const rawCookie = res.headers.get('set-cookie') ?? '';
  const cookie = rawCookie.match(/FINANCEOS_SESSION=([^;]+)/)?.[1];
  if (res.status === 200) {
    return { status: res.status, user: body as UserResponse, cookie };
  }
  return { status: res.status, error: body as { code?: string; message?: string } };
}

/** Signs in through the stubbed Google identity and returns an authenticated client. */
export async function ssoLogin(
  identity: GoogleIdentity,
  codeIndex = 0
): Promise<{ user: UserResponse; cookie: string; api: ApiClient }> {
  const res = await ssoCallback({ code: identity.codes[codeIndex] });
  if (res.status !== 200 || !res.cookie || !res.user) {
    throw new Error(`SSO callback failed (${res.status}): ${JSON.stringify(res.error)}`);
  }
  return { user: res.user, cookie: res.cookie, api: makeApi(res.cookie) };
}

// ---------------------------------------------------------------------------
// Gmail connect (API level)
// ---------------------------------------------------------------------------

/** Plays Google's redirect into the server's Gmail callback; returns the Location it 302s to. */
export async function gmailCallback(
  api: ApiClient,
  params: { code?: string; state?: string; error?: string }
): Promise<string> {
  const res = await api.GET('/api/v1/gmail/oauth/callback', {
    params: { query: { ...params, state: params.state ?? randomUUID() } },
    redirect: 'manual',
  });
  expectStatus(res, 302);
  return res.response.headers.get('location') ?? '';
}

export async function listConnections(api: ApiClient): Promise<GmailConnectionResponse[]> {
  const res = await api.GET('/api/v1/gmail/connections');
  expectStatus(res, 200);
  return res.data ?? [];
}

/** Connects the identity's mailbox to the current user through the real callback endpoint. */
export async function connectGmail(
  api: ApiClient,
  identity: GoogleIdentity,
  codeIndex = 0
): Promise<GmailConnectionResponse> {
  const location = await gmailCallback(api, { code: identity.codes[codeIndex] });
  if (!location.includes('gmail=success')) {
    throw new Error(`Gmail connect did not succeed, redirected to ${location}`);
  }
  const connection = (await listConnections(api)).find((c) => c.email === identity.email);
  if (!connection) {
    throw new Error(`Connection for ${identity.email} not listed after callback`);
  }
  return connection;
}

export async function createSender(
  api: ApiClient,
  overrides?: Partial<GmailSenderRequest>
): Promise<GmailSenderResponse> {
  const body: GmailSenderRequest = {
    senderAddress: BANK_SENDER,
    name: BANK_SENDER_NAME,
    enabled: true,
    ...overrides,
  };
  const res = await api.POST('/api/v1/gmail/senders', { body });
  expectStatus(res, 200);
  return res.data!;
}

// ---------------------------------------------------------------------------
// Sync jobs
// ---------------------------------------------------------------------------

export async function runSync(
  api: ApiClient,
  options: { timeoutMs?: number } = {}
): Promise<{ job: JobResponse; summary: SyncSummary }> {
  const res = await api.POST('/api/v1/gmail/sync');
  expectStatus(res, 202);
  const job = await waitForJob(api, res.data!.jobId, { timeoutMs: options.timeoutMs ?? 90_000 });
  return { job, summary: job.result as unknown as SyncSummary };
}

/**
 * Account and sender changes enqueue GMAIL_SYNC jobs of their own (AFTER_COMMIT events). Wait for
 * every one of the user's sync jobs to leave PENDING/RUNNING before asserting on ledger state.
 */
export async function waitForGmailJobsIdle(api: ApiClient, timeoutMs = 90_000): Promise<void> {
  const start = Date.now();
  let quietPolls = 0;
  // The event listener enqueues after the HTTP response has already returned; give it a beat.
  await new Promise((r) => setTimeout(r, 400));
  while (Date.now() - start < timeoutMs) {
    const res = await api.GET('/api/v1/jobs', {
      params: { query: { status: 'active', type: 'GMAIL_SYNC', size: 5 } },
    });
    expectStatus(res, 200);
    const active = res.data?.content ?? [];
    if (active.length === 0) {
      quietPolls += 1;
      if (quietPolls >= 2) return;
    } else {
      quietPolls = 0;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Gmail sync jobs still active after ${timeoutMs}ms`);
}

export async function attentionItems(
  api: ApiClient,
  includeRetryable = false
): Promise<GmailAttentionItemResponse[]> {
  const res = await api.GET('/api/v1/gmail/attention', {
    params: { query: { page: 0, size: 50, includeRetryable } },
  });
  expectStatus(res, 200);
  return res.data?.content ?? [];
}

// ---------------------------------------------------------------------------
// Synthetic mail
// ---------------------------------------------------------------------------

export function alertMail(opts: {
  last4: string;
  amount: number;
  merchant: string;
  /** Transaction date the bank states (YYYY-MM-DD) — what the extractor is expected to return. */
  date: string;
  sentAt?: Date;
  direction?: 'DEBIT' | 'CREDIT';
  id?: string;
}): MailMessage {
  const id = opts.id ?? mailId('alert');
  const verb = (opts.direction ?? 'DEBIT') === 'DEBIT' ? 'debited from' : 'credited to';
  return {
    id,
    from: `E2E Bank <${BANK_SENDER}>`,
    subject: `Transaction alert ${opts.merchant} INR ${opts.amount} ${id}`,
    sentAt: opts.sentAt ?? daysAgo(1),
    text:
      `Dear Customer,\n\nINR ${opts.amount.toFixed(2)} has been ${verb} your account ending ${opts.last4} ` +
      `on ${opts.date} at ${opts.merchant}.\n\nIf you did not make this transaction, call us.\n` +
      `Ref ${id}\n-- E2E Bank (synthetic test data)`,
  };
}

export function otpMail(opts: { sentAt?: Date; id?: string } = {}): MailMessage {
  const id = opts.id ?? mailId('otp');
  return {
    id,
    from: `E2E Bank <${BANK_SENDER}>`,
    subject: `One time password ${id}`,
    sentAt: opts.sentAt ?? daysAgo(1),
    text: `Your OTP for net banking login is 482913. It is valid for 10 minutes. Ref ${id}`,
  };
}

export function statementMail(opts: {
  pdf: Buffer;
  filename?: string;
  sentAt?: Date;
  id?: string;
}): MailMessage {
  const id = opts.id ?? mailId('stmt');
  return {
    id,
    from: `E2E Bank <${BANK_SENDER}>`,
    subject: `Your account statement ${id}`,
    sentAt: opts.sentAt ?? daysAgo(1),
    text: `Dear Customer, please find your account statement attached. Ref ${id}`,
    attachments: [
      { filename: opts.filename ?? `statement-${id}.pdf`, mimeType: 'application/pdf', data: opts.pdf },
    ],
  };
}

// ---------------------------------------------------------------------------
// Scripted extraction (task `email-extract`)
// ---------------------------------------------------------------------------

export function extractedTxn(opts: {
  amount: number;
  date: string;
  last4: string;
  merchant: string;
  direction?: 'DEBIT' | 'CREDIT';
}): Record<string, unknown> {
  return {
    isTransaction: true,
    amount: opts.amount,
    currency: 'INR',
    direction: opts.direction ?? 'DEBIT',
    date: opts.date,
    description: opts.merchant,
    accountLast4: opts.last4,
    confidence: 0.92,
  };
}

/** A scripted `email-extract` answer keyed to one mail (prompts embed `Subject: <subject>`). */
export function extractionFor(
  mail: MailMessage,
  answer: { json?: Record<string, unknown>; error?: { kind: string; message: string }; delayMs?: number }
): ScriptResponseEntry {
  return { ...answer, promptContains: `Subject: ${mail.subject}` };
}

export async function scriptExtractions(api: ApiClient, entries: ScriptResponseEntry[]): Promise<void> {
  await scriptLlm(api, 'email-extract', entries);
}
