import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobResponse, SyncSummary } from '@/lib/types';

import { ActiveJobBody } from './ActiveJobBody';
import { GmailSyncResult } from './GmailSyncResult';
import { JobActions } from './JobActions';
import { JobBox } from './JobBox';
import { JobErrorBody } from './JobErrorBody';

const cancel = vi.fn();
const retry = vi.fn();
let busy = false;
vi.mock('@/features/jobs/useJobMutations', () => ({
  useJobMutations: () => ({ cancel, retry, busy }),
}));

const job = (over: Partial<JobResponse> = {}): JobResponse =>
  ({
    id: 'j1',
    type: 'GMAIL_SYNC',
    status: 'SUCCEEDED',
    createdAt: new Date().toISOString(),
    startedAt: '2026-10-13T08:00:00Z',
    finishedAt: '2026-10-13T08:00:06Z',
    ...over,
  }) as JobResponse;

beforeEach(() => {
  cancel.mockReset();
  retry.mockReset();
  busy = false;
});

describe('JobBox', () => {
  it('shows the status badge, time and duration, with a chevron on a finished job', () => {
    const onExpandedChange = vi.fn();
    render(<JobBox job={job()} expanded={false} onExpandedChange={onExpandedChange} />);
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByTestId('job-time').textContent).toMatch(/^\d{1,2}:\d{2} (am|pm)$/);
    expect(screen.getByTestId('job-duration')).toHaveTextContent('6s');
    fireEvent.click(screen.getByRole('button', { name: 'Expand details' }));
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  it('flips the chevron label when expanded', () => {
    render(<JobBox job={job()} expanded onExpandedChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Collapse details' })).toBeInTheDocument();
  });

  it('has no chevron on an active job and shows older jobs with their date', () => {
    render(<JobBox job={job({ status: 'RUNNING', createdAt: '2025-01-12T09:00:00Z' })} expanded={false} onExpandedChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /details/ })).toBeNull();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByTestId('job-time').textContent).toMatch(/^12 Jan 2025 \d{1,2}:\d{2} (am|pm)$/);
  });
});

describe('ActiveJobBody', () => {
  it('shows the note and a determinate bar when the total is known', () => {
    render(<ActiveJobBody job={job({ status: 'RUNNING', progressNote: 'Reading 3 of 8 emails', progressCurrent: 3, progressTotal: 8 })} />);
    expect(screen.getByText('Reading 3 of 8 emails')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  });

  it('shows an indeterminate bar without a total', () => {
    render(<ActiveJobBody job={job({ status: 'PENDING', progressNote: 'Waiting to start' })} />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });
});

describe('JobActions', () => {
  it('cancels a running job', () => {
    render(<JobActions job={job({ status: 'RUNNING' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalledWith('j1');
  });

  it('keeps Cancel on a pending job and disables it once cancelling', () => {
    const { rerender } = render(<JobActions job={job({ status: 'PENDING' })} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    rerender(<JobActions job={job({ status: 'RUNNING', cancelRequested: true })} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it.each(['FAILED', 'CANCELLED'] as const)('retries a %s job', (status) => {
    render(<JobActions job={job({ status })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledWith('j1');
  });

  it('draws nothing for a succeeded job', () => {
    const { container } = render(<JobActions job={job()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('JobErrorBody', () => {
  it('toggles the code and message', () => {
    render(<JobErrorBody errorCode="GMAIL_AUTH" errorMessage="Token has been expired" />);
    expect(screen.queryByTestId('job-error-text')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Error details \(GMAIL_AUTH\)/ }));
    expect(screen.getByTestId('job-error-text')).toHaveTextContent('GMAIL_AUTH: Token has been expired');
  });

  it('renders nothing without a code or message', () => {
    const { container } = render(<JobErrorBody />);
    expect(container).toBeEmptyDOMElement();
  });
});

const group = (key: string) => document.querySelector(`[data-group="${key}"]`) as HTMLElement;

const message = (over: Record<string, unknown>) => ({
  ledgerId: 'l1',
  gmailMessageId: 'g1',
  receivedAt: '2026-10-13T10:00:00Z',
  sender: 'alerts@hdfcbank.net',
  subject: 'Transaction alert',
  status: 'CREATED',
  attemptCount: 0,
  createdCount: 0,
  matchedCount: 0,
  transactions: [],
  ...over,
});

const fullResult = {
  discovered: 14,
  processed: 14,
  created: 2,
  reconciled: 1,
  skipped: 10,
  parked: 1,
  failedRetryable: 1,
  failedPermanent: 0,
  backlogRemaining: 2,
  mailbox: 'arjun.mehta@gmail.test',
  listed: 14,
  searchedSince: '2026-10-12T09:00:00',
  backfilledTo: '2026-10-01',
  senders: ['a@x.test', 'b@x.test'],
  statusCounts: { SKIPPED_NOT_TRANSACTION: 3, SKIPPED_DUPLICATE: 7, UNRESOLVED_ACCOUNT: 1 },
  alreadyProcessed: 7,
  nonTransaction: 3,
  messages: [
    message({ ledgerId: 'f1', status: 'FAILED_RETRYABLE', subject: 'HDFC statement', error: 'Could not open the PDF', attemptCount: 2, nextRetryAt: '2026-10-20T15:00:00', attachmentFilename: 'statement.pdf' }),
    message({ ledgerId: 'p1', status: 'UNRESOLVED_ACCOUNT', subject: 'Uber receipt', last4: '9999' }),
    message({
      ledgerId: 'c1',
      status: 'CREATED',
      accountName: 'HDFC Regalia Gold',
      accountId: 'acc1',
      last4: '5251',
      createdCount: 3,
      transactions: [
        { id: 't1', date: '2026-10-13', description: 'Swiggy', amount: '1240', type: 'DEBIT' },
        { id: 't2', date: '2026-10-12', description: 'Amazon refund', amount: '899', type: 'CREDIT' },
      ],
    }),
    message({ ledgerId: 'o1', status: 'CLEANED_UP', subject: 'Odd one' }),
  ],
  messagesTruncated: 3,
} as unknown as SyncSummary;

describe('GmailSyncResult', () => {
  it('shows the run context and the senders toggle', () => {
    render(<GmailSyncResult result={fullResult} />);
    expect(screen.getByText('Gmail sync summary')).toBeInTheDocument();
    expect(screen.getByText('arjun.mehta@gmail.test')).toBeInTheDocument();
    expect(screen.getByText(/New mail since 12\/10\/2026, 9:00 am · backfilled to 01\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText('Gmail returned 14 emails, 14 new')).toBeInTheDocument();
    expect(screen.queryByText('a@x.test')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Senders checked \(2\)/ }));
    expect(screen.getByText('a@x.test')).toBeInTheDocument();
  });

  it('shows six counters with Parked warning and Failed danger, the rest neutral', () => {
    render(<GmailSyncResult result={fullResult} />);
    const tones = Object.fromEntries(
      screen.getAllByTestId('sync-counter').map((c) => [c.getAttribute('data-label'), c.querySelector('[data-tone]')!.getAttribute('data-tone')]),
    );
    expect(tones).toEqual({
      Discovered: 'ink',
      Processed: 'ink',
      Created: 'ink',
      Reconciled: 'ink',
      Parked: 'warning',
      Failed: 'danger',
    });
  });

  it('shows the breakdown lines and the skipped split', () => {
    render(<GmailSyncResult result={fullResult} />);
    const lines = screen.getByTestId('sync-breakdown');
    expect(lines).toHaveTextContent('Skipped (10): Not a transaction 3 · Already imported 7');
    expect(lines).toHaveTextContent('Parked (1): No matching account 1');
    expect(lines).toHaveTextContent('Failed (1): 1 will retry · 0 permanent');
    expect(lines).toHaveTextContent('2 still queued (retries wait for their scheduled time).');
    expect(screen.getByText(/Of the skipped: 7 already processed · 3 non-transaction emails/)).toBeInTheDocument();
  });

  it('says when the run hit its email limit', () => {
    render(<GmailSyncResult result={{ ...fullResult, budget: 14 } as SyncSummary} />);
    expect(screen.getByTestId('sync-breakdown')).toHaveTextContent('Hit the 14-email limit for this run; 2 still queued, the next sync continues.');
  });

  it('opens Failed and Parked groups, closes the rest, and groups unknown statuses as Other', () => {
    render(<GmailSyncResult result={fullResult} />);
    expect(group('failed')).toHaveTextContent('Failed (1)');
    expect(group('failed')).toHaveTextContent('HDFC statement');
    expect(group('parked')).toHaveTextContent('Uber receipt');
    expect(group('created')).not.toHaveTextContent('Swiggy');
    expect(group('other')).toHaveTextContent('Other (1)');
    fireEvent.click(screen.getByRole('button', { name: 'Created (1)' }));
    expect(group('created')).toHaveTextContent('Swiggy');
  });

  it('shows email fields, outcome lines, transactions and actions', () => {
    render(<GmailSyncResult result={fullResult} />);
    const failed = group('failed');
    expect(failed).toHaveTextContent('Could not open the PDF');
    expect(failed).toHaveTextContent('Attempt 2 · next retry 20/10/2026, 3:00 pm');
    expect(failed).toHaveTextContent('File: statement.pdf');
    expect(screen.getByRole('link', { name: 'Retry from Gmail settings' })).toHaveAttribute('href', '/settings/connections');
    expect(screen.getByRole('link', { name: 'Import manually' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Assign an account in Gmail settings' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Created (1)' }));
    const created = group('created');
    expect(created).toHaveTextContent('Card / a/c ••5251');
    expect(within(created).getByRole('link', { name: 'HDFC Regalia Gold' })).toHaveAttribute('href', '/accounts/acc1');
    expect(created).toHaveTextContent('Swiggy');
    expect(created).toHaveTextContent('+₹899');
    expect(created).toHaveTextContent('…and 1 more');
  });

  it('says how many emails were not listed', () => {
    render(<GmailSyncResult result={fullResult} />);
    expect(screen.getByText('…and 3 more emails not listed')).toBeInTheDocument();
  });

  it('shows the middle format: six tiles and the one-line summary', () => {
    const middle = { discovered: 9, processed: 9, created: 7, reconciled: 1, skipped: 1, parked: 0, failedRetryable: 0, failedPermanent: 0, backlogRemaining: 0 } as SyncSummary;
    render(<GmailSyncResult result={middle} />);
    expect(screen.getAllByTestId('sync-counter')).toHaveLength(6);
    expect(screen.getByTestId('sync-middle-line')).toHaveTextContent('Skipped: 1 · Retryable: 0 · Backlog remaining: 0');
    expect(screen.queryByText('Mailbox')).toBeNull();
  });

  it('shows the oldest format: five tiles and the Needs attention table', () => {
    const legacy = {
      fetched: 9,
      created: 6,
      reconciled: 1,
      skipped: 1,
      failed: 1,
      attention: [
        { gmailMessageId: 'm1', from: 'Uber <alerts@uber.com>', subject: 'Your Uber receipt', receivedAt: '2026-10-10T10:00:00Z', outcome: 'ACCOUNT_UNRESOLVED', reason: 'No matching account', accountLast4: '9999' },
        { gmailMessageId: 'm2', from: 'statements@hdfcbank.net', subject: 'Credit card statement', receivedAt: '2026-10-09T10:00:00Z', outcome: 'DECRYPT_FAILED', reason: 'PDF password' },
      ],
      attentionTruncated: 4,
    } as unknown as SyncSummary;
    render(<GmailSyncResult result={legacy} />);
    expect(screen.getAllByTestId('sync-counter').map((c) => c.getAttribute('data-label'))).toEqual(['Fetched', 'Created', 'Reconciled', 'Skipped', 'Failed']);
    expect(screen.queryByText('Your Uber receipt')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Needs attention (2)' }));
    expect(screen.getAllByText('alerts@uber.com').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Add or fix account ending 9999' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Set the statement password on the account' }).length).toBeGreaterThan(0);
    expect(screen.getByText('…and 4 more')).toBeInTheDocument();
  });
});
