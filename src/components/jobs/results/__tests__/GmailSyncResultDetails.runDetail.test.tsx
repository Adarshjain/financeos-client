import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { SyncMessageResult, SyncSummary } from '@/lib/types';

import { GmailSyncResultDetails } from '../GmailSyncResultDetails';

function message(overrides: Partial<SyncMessageResult>): SyncMessageResult {
  return {
    ledgerId: overrides.gmailMessageId ?? 'l1',
    gmailMessageId: 'm1',
    receivedAt: '2026-10-11T04:30:00Z',
    sender: 'alerts@bank.com',
    subject: 'Subject',
    status: 'CREATED',
    attemptCount: 0,
    createdCount: 0,
    matchedCount: 0,
    transactions: [],
    ...overrides,
  };
}

function summary(overrides: Partial<SyncSummary> = {}): SyncSummary {
  return {
    discovered: 3,
    processed: 4,
    created: 1,
    reconciled: 0,
    skipped: 0,
    parked: 0,
    failedRetryable: 0,
    failedPermanent: 0,
    backlogRemaining: 0,
    mailbox: 'me@example.com',
    listed: 10,
    searchedSince: '2026-10-10T05:45:00Z',
    backfilledTo: null,
    senders: ['alerts@bank.com', 'statements@bank.com'],
    budget: 100,
    statusCounts: {},
    messages: [],
    messagesTruncated: 0,
    ...overrides,
  };
}

describe('GmailSyncResultDetails run detail', () => {
  it('shows the mailbox, the window searched and how much was new', () => {
    render(<GmailSyncResultDetails result={summary({ backfilledTo: '2026-08-01' })} />);

    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    expect(screen.getByText(/New mail since/)).toHaveTextContent(/backfilled to 1 Aug 26/);
    expect(screen.getByText('Gmail returned 10 emails, 3 new')).toBeInTheDocument();
  });

  it('lists the senders checked on demand', () => {
    render(<GmailSyncResultDetails result={summary()} />);

    expect(screen.queryByText('statements@bank.com')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Senders checked (2)'));
    expect(screen.getByText('statements@bank.com')).toBeInTheDocument();
  });

  it('splits skipped, parked and failed by reason', () => {
    render(
      <GmailSyncResultDetails
        result={summary({
          skipped: 4,
          parked: 2,
          failedRetryable: 1,
          failedPermanent: 1,
          statusCounts: {
            SKIPPED_NOT_TRANSACTION: 3,
            SKIPPED_DUPLICATE: 1,
            UNRESOLVED_ACCOUNT: 1,
            ACCOUNT_NOT_OPTED_IN: 1,
            FAILED_RETRYABLE: 1,
            FAILED_PERMANENT: 1,
          },
        })}
      />,
    );

    expect(screen.getByText('Skipped (4):').parentElement).toHaveTextContent('Not a transaction 3 · Already imported 1');
    expect(screen.getByText('Parked (2):').parentElement).toHaveTextContent('No matching account 1 · Account not opted in 1');
    expect(screen.getByText('Failed (2):').parentElement).toHaveTextContent('1 will retry · 1 permanent');
    expect(screen.queryByText(/Backlog remaining/)).not.toBeInTheDocument();
  });

  it('says when the run hit its email limit', () => {
    render(<GmailSyncResultDetails result={summary({ processed: 100, backlogRemaining: 240 })} />);
    expect(screen.getByText('Hit the 100-email limit for this run; 240 still queued, the next sync continues.')).toBeInTheDocument();
  });

  it('says what is still queued when the limit was not hit', () => {
    render(<GmailSyncResultDetails result={summary({ processed: 4, backlogRemaining: 2 })} />);
    expect(screen.getByText('2 still queued (retries wait for their scheduled time).')).toBeInTheDocument();
  });

  it('opens problem groups and keeps the rest collapsed', () => {
    render(
      <GmailSyncResultDetails
        result={summary({
          messages: [
            message({ gmailMessageId: 'f1', status: 'FAILED_RETRYABLE', subject: 'Failing alert', error: 'LLM timed out', attemptCount: 2, nextRetryAt: '2026-10-12T10:00:00Z' }),
            message({ gmailMessageId: 'c1', status: 'CREATED', subject: 'You spent 450' }),
          ],
        })}
      />,
    );

    expect(screen.getByText('Failing alert')).toBeInTheDocument();
    expect(screen.getByText('LLM timed out')).toBeInTheDocument();
    expect(screen.getByText(/Attempt 2 · next retry/)).toBeInTheDocument();
    expect(screen.queryByText('You spent 450')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Created (1)'));
    expect(screen.getByText('You spent 450')).toBeInTheDocument();
  });

  it('shows the account and the transactions an email created', () => {
    render(
      <GmailSyncResultDetails
        result={summary({
          messages: [
            message({
              status: 'RECONCILED',
              subject: 'October statement',
              accountId: 'acc-1',
              accountName: 'Amex Plat',
              last4: '1005',
              attachmentFilename: 'Oct.pdf',
              createdCount: 7,
              matchedCount: 3,
              transactions: [
                { id: 't1', date: '2026-10-03', amount: 450, description: 'SWIGGY', type: 'DEBIT' },
                { id: 't2', date: '2026-10-04', amount: 1200, description: 'REFUND', type: 'CREDIT' },
              ],
            }),
          ],
        })}
      />,
    );
    fireEvent.click(screen.getByText('Statements reconciled (1)'));

    expect(screen.getByRole('link', { name: 'Amex Plat' })).toHaveAttribute('href', '/legacy/accounts/acc-1');
    expect(screen.getByText('Card / a/c ••1005')).toBeInTheDocument();
    expect(screen.getByText('File: Oct.pdf')).toBeInTheDocument();
    expect(screen.getByText(/7 new transactions, 3 matched to\s+existing alerts/)).toBeInTheDocument();
    expect(screen.getByText('SWIGGY')).toBeInTheDocument();
    expect(screen.getByText(/^\+/)).toHaveTextContent('1,200');
    expect(screen.getByText('…and 5 more')).toBeInTheDocument();
  });

  it('points each problem at the place to fix it', () => {
    render(
      <GmailSyncResultDetails
        result={summary({
          messages: [
            message({ gmailMessageId: 'u1', status: 'UNRESOLVED_ACCOUNT', last4: '5555', error: 'No single account matches card/account ending 5555' }),
            message({ gmailMessageId: 'o1', status: 'ACCOUNT_NOT_OPTED_IN', accountId: 'acc-9', accountName: 'SBI' }),
            message({ gmailMessageId: 'd1', status: 'FAILED_PERMANENT', error: 'Encrypted statement could not be decrypted', attachmentFilename: 's.pdf' }),
          ],
        })}
      />,
    );

    expect(screen.getByText('No single account matches card/account ending 5555')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Assign an account in Gmail settings' })).toHaveAttribute('href', '/legacy/settings/gmail');
    expect(screen.getByRole('link', { name: 'Set ingest date' })).toHaveAttribute('href', '/legacy/accounts/acc-9');
    expect(screen.getByRole('link', { name: 'Set the statement password on the account' })).toHaveAttribute('href', '/legacy/accounts');
    expect(screen.getByRole('link', { name: 'Retry from Gmail settings' })).toHaveAttribute('href', '/legacy/settings/gmail');
    expect(screen.getByRole('link', { name: 'Import manually' })).toHaveAttribute('href', '/legacy/transactions/import');
    expect(screen.getByText(/no more automatic retries/)).toBeInTheDocument();
  });

  it('a failed alert without a file offers no manual import', () => {
    render(
      <GmailSyncResultDetails
        result={summary({ messages: [message({ status: 'FAILED_RETRYABLE', error: 'boom', attemptCount: 1 })] })}
      />,
    );
    expect(screen.queryByRole('link', { name: 'Import manually' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Set the statement password on the account' })).not.toBeInTheDocument();
  });

  it('notes emails left off a capped list', () => {
    render(<GmailSyncResultDetails result={summary({ messages: [message({})], messagesTruncated: 3 })} />);
    expect(screen.getByText('…and 3 more emails not listed')).toBeInTheDocument();
  });

  it('a result without run detail keeps the old summary line', () => {
    const old = summary({ statusCounts: undefined, mailbox: undefined, messages: undefined, backlogRemaining: 5 });
    render(<GmailSyncResultDetails result={old} />);
    expect(screen.getByText('Backlog remaining: 5')).toBeInTheDocument();
    expect(screen.queryByText(/Gmail returned/)).not.toBeInTheDocument();
    expect(screen.queryByText('Emails in this run')).not.toBeInTheDocument();
  });
});
