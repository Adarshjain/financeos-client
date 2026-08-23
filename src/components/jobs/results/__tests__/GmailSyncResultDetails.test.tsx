import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { SyncSummary } from '@/lib/types';

import { GmailSyncResultDetails } from '../GmailSyncResultDetails';

describe('GmailSyncResultDetails Component', () => {
  it('renders old sync result shape without crashing', () => {
    const oldResult: SyncSummary = {
      fetched: 10,
      created: 5,
      reconciled: 4,
      skipped: 3,
      failed: 1,
    };

    render(<GmailSyncResultDetails result={oldResult} />);
    expect(screen.getByText('Gmail Sync Summary')).toBeInTheDocument();
    expect(screen.getByText('Fetched')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText(/Needs attention/i)).not.toBeInTheDocument();
  });

  it('renders new sync result with skipped breakdown and Needs Attention section', () => {
    const newResult: SyncSummary = {
      discovered: 15,
      processed: 15,
      created: 3,
      reconciled: 2,
      skipped: 8,
      parked: 1,
      failedPermanent: 2,
      alreadyProcessed: 5,
      nonTransaction: 3,
      attention: [
        {
          gmailMessageId: 'msg-1',
          from: 'Bank Alerts <alerts@bank.com>',
          subject: 'Credit Card Statement',
          receivedAt: '2026-08-20T10:00:00Z',
          attachmentFilename: 'stmt.pdf',
          outcome: 'ACCOUNT_UNRESOLVED',
          reason: 'No account ends in 1234',
          accountLast4: '1234',
        },
        {
          gmailMessageId: 'msg-2',
          from: 'support@bank.com',
          subject: 'Encrypted Statement',
          receivedAt: '2026-08-21T10:00:00Z',
          attachmentFilename: 'protected.pdf',
          outcome: 'DECRYPT_FAILED',
          reason: 'Encrypted statement could not be decrypted',
        },
        {
          gmailMessageId: 'msg-3',
          from: 'statements@bank.com',
          subject: 'Parse Error',
          receivedAt: '2026-08-22T10:00:00Z',
          outcome: 'PARSE_FAILED',
          reason: 'Invalid statement format',
        },
        {
          gmailMessageId: 'msg-4',
          from: 'alerts@bank.com',
          subject: 'Transaction Alert',
          receivedAt: '2026-08-23T10:00:00Z',
          outcome: 'EXTRACTION_FAILED',
          reason: 'Gemini extraction failed',
        },
      ],
      attentionTruncated: 2,
    };

    render(<GmailSyncResultDetails result={newResult} />);

    expect(screen.getByText('Discovered')).toBeInTheDocument();
    expect(screen.getByText('Processed')).toBeInTheDocument();
    expect(screen.getByText(/Of the skipped: 5 already processed · 3 non-transaction emails/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs attention/i)).toBeInTheDocument();

    // Expand section
    fireEvent.click(screen.getByText(/Needs attention/i));

    expect(screen.getAllByText('alerts@bank.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('support@bank.com').length).toBeGreaterThan(0);

    expect(screen.getAllByText('Add or fix account ending 1234').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Set the statement password on the account').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Import manually').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Will retry on next sync').length).toBeGreaterThan(0);

    expect(screen.getByText('…and 2 more')).toBeInTheDocument();
  });
});
