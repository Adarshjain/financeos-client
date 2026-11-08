import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

const a = vi.hoisted(() => ({
  loadFailureSummary: vi.fn(),
  loadFailedEmails: vi.fn(),
  loadFailedJobs: vi.fn(),
  loadEmailDetail: vi.fn(),
  loadJobDetail: vi.fn(),
  retryEmail: vi.fn(),
  skipEmail: vi.fn(),
  retryJob: vi.fn(),
  dismissJob: vi.fn(),
  retryAllFailures: vi.fn(),
}));
vi.mock('./failuresActions', () => a);

const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "t1"), dismiss: vi.fn() }));
vi.mock('@/lib/notify', () => ({ notify }));
vi.mock('@/lib/toastError', () => ({ toastErrorResult: (e: { message: string }) => notify.error(e.message) }));

import type { FailedEmail, FailedJob } from './failuresModel';
import { FailuresScreen } from './FailuresScreen';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const email = (over: Partial<FailedEmail> = {}): FailedEmail => ({
  ledgerId: 'L1',
  gmailMessageId: 'm1',
  userId: 'U1',
  userEmail: 'a@x.com',
  connectionEmail: 'box@gmail.com',
  sender: 'bank@hdfc.com',
  subject: 'Card alert',
  internalDate: '2026-10-13T08:00:00Z',
  status: 'FAILED_RETRYABLE',
  attemptCount: 2,
  nextRetryAt: '2026-10-13T10:00:00Z',
  error: 'Boom first line\nsecond line',
  ...over,
});
const job = (over: Partial<FailedJob> = {}): FailedJob => ({
  id: 'J1',
  type: 'IMPORT',
  jobName: 'Statement import',
  userEmail: 'b@x.com',
  attempt: 1,
  retryable: true,
  finishedAt: '2026-10-13T08:00:00Z',
  error: 'Job broke',
  ...over,
});
const page = <T,>(content: T[]) => ({ content, totalElements: content.length, totalPages: 1 });
const summary = { failedGmailRetryable: 3, failedGmailPermanent: 1, failedJobs: 2 };

function renderScreen(emails = [email()]) {
  a.loadFailureSummary.mockResolvedValue({ success: true, data: summary });
  a.loadFailedEmails.mockResolvedValue({ success: true, data: page(emails) });
  return renderWithQuery(<FailuresScreen summary={summary} emails={page(emails) as never} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  a.loadFailedJobs.mockResolvedValue({ success: true, data: page([job()]) });
  a.loadEmailDetail.mockResolvedValue({ success: true, data: email({ errorDetail: 'STACK email' }) });
  a.loadJobDetail.mockResolvedValue({ success: true, data: job({ errorDetail: 'STACK job' }) });
});

describe('FailuresScreen', () => {
  it('shows the counts line and the email rows with three lines', () => {
    renderScreen();
    expect(screen.getByText('3 emails retrying · 1 email failed · 2 jobs failed')).toBeInTheDocument();
    expect(screen.getByText('Card alert')).toBeInTheDocument();
    expect(
      screen.getByText(/a@x.com · bank@hdfc.com · 13\/10\/2026 · Retrying, try 2 of 5 · next try/),
    ).toBeInTheDocument();
    expect(screen.getByText('Boom first line')).toBeInTheDocument();
  });

  it('shows the all-clear line and the empty email state', () => {
    a.loadFailureSummary.mockResolvedValue({ success: true, data: { failedGmailRetryable: 0, failedGmailPermanent: 0, failedJobs: 0 } });
    renderWithQuery(
      <FailuresScreen summary={{ failedGmailRetryable: 0, failedGmailPermanent: 0, failedJobs: 0 }} emails={page([]) as never} />,
    );
    expect(screen.getByText('Nothing has failed in the last 30 days.')).toBeInTheDocument();
    expect(screen.getByText('No failed emails.')).toBeInTheDocument();
  });

  it('shows a loading toast from the menu press until the retry settles, then the result replaces it', async () => {
    let settle: (v: unknown) => void = () => undefined;
    a.retryEmail.mockReturnValue(new Promise((resolve) => (settle = resolve)));
    renderScreen();
    await user.click(screen.getAllByRole('button', { name: 'More options' })[0]);
    await user.click(await screen.findByRole('menuitem', { name: 'Retry now' }));
    expect(notify.loading).toHaveBeenCalledWith('Retrying that email');
    expect(notify.dismiss).not.toHaveBeenCalled();
    settle({ success: true, data: { jobId: 'j' } });
    await waitFor(() => expect(notify.dismiss).toHaveBeenCalledWith('t1'));
    expect(notify.success).toHaveBeenCalledWith('Retrying that email');
  });

  it('retries an email from its menu, toasts and refreshes', async () => {
    a.retryEmail.mockResolvedValue({ success: true, data: { jobId: 'j' } });
    renderScreen();
    await user.click(screen.getAllByRole('button', { name: 'More options' })[0]);
    await user.click(await screen.findByRole('menuitem', { name: 'Retry now' }));
    await waitFor(() => expect(a.retryEmail).toHaveBeenCalledWith('L1'));
    await waitFor(() => expect(notify.success).toHaveBeenCalled());
    await waitFor(() => expect(a.loadFailureSummary).toHaveBeenCalled());
  });

  it('requires a reason before Skip, then skips', async () => {
    a.skipEmail.mockResolvedValue({ success: true, data: undefined });
    renderScreen();
    await user.click(screen.getAllByRole('button', { name: 'More options' })[0]);
    await user.click(await screen.findByRole('menuitem', { name: 'Skip…' }));
    const skip = await screen.findByRole('button', { name: 'Skip' });
    expect(skip).toBeDisabled();
    await user.type(screen.getByLabelText('Reason'), 'spam');
    expect(skip).toBeEnabled();
    await user.click(skip);
    await waitFor(() => expect(a.skipEmail).toHaveBeenCalledWith('L1', 'spam'));
  });

  it('shows a 409 as the plain message and still refreshes', async () => {
    a.retryEmail.mockResolvedValue({
      success: false,
      status: 409,
      error: { code: 'NOT_FAILED', message: 'This item is no longer failed. The list was refreshed.' },
    });
    renderScreen();
    await user.click(screen.getAllByRole('button', { name: 'More options' })[0]);
    await user.click(await screen.findByRole('menuitem', { name: 'Retry now' }));
    await waitFor(() => expect(notify.error).toHaveBeenCalledWith('This item is no longer failed. The list was refreshed.'));
    await waitFor(() => expect(a.loadFailureSummary).toHaveBeenCalled());
  });

  it('opens Details on a row click with the stack, ids and the Gmail link', async () => {
    renderScreen();
    await user.click(screen.getByText('Card alert'));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText('STACK email')).toBeInTheDocument());
    expect(within(dialog).getByRole('button', { name: 'Copy Ledger id' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Open in Gmail' })).toHaveAttribute(
      'href',
      'https://mail.google.com/mail/u/?authuser=box%40gmail.com#all/m1',
    );
  });

  it('confirms Retry all with the count, then toasts the result', async () => {
    a.retryAllFailures.mockResolvedValue({ success: true, data: { affected: 4, jobsEnqueued: 2, skipped: 0 } });
    renderScreen();
    await user.click(screen.getByRole('button', { name: 'Retry all' }));
    expect(await screen.findByText('Retry all 4 failed emails?')).toBeInTheDocument();
    expect(a.retryAllFailures).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Retry all' }));
    await waitFor(() => expect(a.retryAllFailures).toHaveBeenCalledWith('gmail'));
    await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Retrying 4 emails (2 syncs queued)'));
  });

  it('switches to Jobs: rows, the files-expired note and Dismiss with a reason', async () => {
    a.loadFailedJobs.mockResolvedValue({ success: true, data: page([job(), job({ id: 'J2', jobName: 'Old import', retryable: false })]) });
    a.dismissJob.mockResolvedValue({ success: true, data: undefined });
    renderScreen();
    await user.click(screen.getByRole('tab', { name: /Jobs/ }));
    expect(await screen.findByText('Statement import')).toBeInTheDocument();
    expect(screen.getByText(/Can't retry: files expired/)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'More options' })[0]);
    await user.click(await screen.findByRole('menuitem', { name: 'Dismiss…' }));
    expect(await screen.findByRole('button', { name: 'Dismiss' })).toBeDisabled();
    await user.type(screen.getByLabelText('Reason'), 'never works');
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(a.dismissJob).toHaveBeenCalledWith('J1', 'never works'));
  });

  it('shows the empty Jobs state and asks for dismissed ones with the toggle', async () => {
    a.loadFailedJobs.mockResolvedValue({ success: true, data: page([]) });
    renderScreen();
    await user.click(screen.getByRole('tab', { name: /Jobs/ }));
    expect(await screen.findByText('No failed jobs in the last 30 days.')).toBeInTheDocument();
    await user.click(screen.getByRole('switch'));
    await waitFor(() => expect(a.loadFailedJobs).toHaveBeenCalledWith(true, 0));
  });

  it('asks for Skipped emails with the filter', async () => {
    renderScreen();
    await user.click(screen.getByRole('button', { name: /Failed/ }));
    await user.click(await screen.findByRole('option', { name: 'Skipped' }));
    await waitFor(() => expect(a.loadFailedEmails).toHaveBeenCalledWith('skipped', 0));
  });
});
