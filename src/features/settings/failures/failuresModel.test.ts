import { describe, expect, it } from 'vitest';

import {
  countsLine,
  ddmmyyyy,
  emailSecondary,
  emailStatusLabel,
  emailStatusParam,
  emailTitle,
  type FailedEmail,
  type FailedJob,
  firstLine,
  jobSecondary,
  openInGmailUrl,
  retryAllCount,
  retryAllQuestion,
  retryAllToast,
} from './failuresModel';

const email = (over: Partial<FailedEmail> = {}): FailedEmail => ({
  ledgerId: 'L1',
  gmailMessageId: 'm1',
  userId: 'U1',
  userEmail: 'a@x.com',
  connectionEmail: 'box+1@gmail.com',
  sender: 'bank@hdfc.com',
  subject: 'Alert',
  internalDate: '2026-10-13T08:00:00Z',
  status: 'FAILED_RETRYABLE',
  attemptCount: 2,
  nextRetryAt: '2026-10-13T10:00:00Z',
  ...over,
});

describe('failuresModel', () => {
  it('builds the counts line, skipping zeros and singularising', () => {
    expect(countsLine({ failedGmailRetryable: 3, failedGmailPermanent: 1, failedJobs: 2 })).toBe(
      '3 emails retrying · 1 email failed · 2 jobs failed',
    );
    expect(countsLine({ failedGmailRetryable: 0, failedGmailPermanent: 0, failedJobs: 1 })).toBe('1 job failed');
    expect(countsLine({ failedGmailRetryable: 0, failedGmailPermanent: 0, failedJobs: 0 })).toBe(
      'Nothing has failed in the last 30 days.',
    );
  });

  it('labels the email status', () => {
    expect(emailStatusLabel(email())).toBe('Retrying, try 2 of 5');
    expect(emailStatusLabel(email({ status: 'FAILED_PERMANENT' }))).toBe('Failed');
    expect(emailStatusLabel(email({ status: 'SKIPPED_BY_ADMIN' }))).toBe('Skipped');
  });

  it('maps the filter to the status param', () => {
    expect(emailStatusParam('failed')).toBeUndefined();
    expect(emailStatusParam('skipped')).toBe('SKIPPED_BY_ADMIN');
  });

  it('titles with the subject, then the sender', () => {
    expect(emailTitle(email())).toBe('Alert');
    expect(emailTitle(email({ subject: ' ' }))).toBe('bank@hdfc.com');
  });

  it('formats dd/mm/yyyy in IST', () => {
    expect(ddmmyyyy('2026-10-13T20:00:00Z')).toBe('14/10/2026');
    expect(ddmmyyyy(null)).toBe('');
  });

  it('writes the secondary line, with the next try only while retrying', () => {
    expect(emailSecondary(email())).toBe(
      'a@x.com · bank@hdfc.com · 13/10/2026 · Retrying, try 2 of 5 · next try 13/10/2026, 3:30 pm',
    );
    expect(emailSecondary(email({ status: 'FAILED_PERMANENT' }))).toBe('a@x.com · bank@hdfc.com · 13/10/2026 · Failed');
  });

  it('writes the job line, flagging files that expired', () => {
    const job = { id: 'J', jobName: 'Import', type: 'T', attempt: 1, retryable: false, userEmail: 'a@x.com', finishedAt: '2026-10-13T08:00:00Z' } as FailedJob;
    expect(jobSecondary(job)).toBe("a@x.com · 13/10/2026, 1:30 pm · Can't retry: files expired");
    expect(jobSecondary({ ...job, retryable: true })).toBe('a@x.com · 13/10/2026, 1:30 pm');
  });

  it('takes the first non-empty error line', () => {
    expect(firstLine('\n  Boom  \nat x')).toBe('Boom');
    expect(firstLine(null)).toBe('');
  });

  it('builds the Gmail link with the mailbox encoded', () => {
    expect(openInGmailUrl(email())).toBe('https://mail.google.com/mail/u/?authuser=box%2B1%40gmail.com#all/m1');
  });

  it('words Retry all', () => {
    const s = { failedGmailRetryable: 3, failedGmailPermanent: 1, failedJobs: 2 };
    expect(retryAllCount('gmail', s)).toBe(4);
    expect(retryAllCount('jobs', s)).toBe(2);
    expect(retryAllQuestion('gmail', 4)).toBe('Retry all 4 failed emails?');
    expect(retryAllQuestion('jobs', 1)).toBe('Retry all 1 failed job?');
    expect(retryAllToast('gmail', { affected: 4, jobsEnqueued: 2, skipped: 0 })).toBe('Retrying 4 emails (2 syncs queued)');
    expect(retryAllToast('jobs', { affected: 3, jobsEnqueued: 0, skipped: 1 })).toBe('Retried 3 jobs, 1 skipped (files expired)');
  });
});
