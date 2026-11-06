import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SyncMessageResult } from '@/lib/types';

import { SyncMessage } from './SyncEmails';

const message = (over: Partial<SyncMessageResult>): SyncMessageResult => ({
  ledgerId: 'l1',
  gmailMessageId: 'g1',
  subject: 'Alert: spent on card',
  sender: 'alerts@bank.test',
  status: 'SKIPPED_DUPLICATE',
  attemptCount: 1,
  createdCount: 0,
  matchedCount: 0,
  transactions: [],
  ...over,
});

describe('SyncMessage for a skipped duplicate', () => {
  it('shows its detail text as a neutral line, not an error', () => {
    render(
      <SyncMessage message={message({ error: 'Attached to an existing transaction (statement line 16/03/2026)' })} />,
    );
    const line = screen.getByText('Attached to an existing transaction (statement line 16/03/2026)');
    expect(line.className).not.toMatch(/danger|rose|red/);
    expect(screen.queryByText(/Attempt/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unknown error/)).not.toBeInTheDocument();
  });

  it('falls back to the status label without a detail', () => {
    render(<SyncMessage message={message({ error: null })} />);
    expect(screen.getByText('Already imported')).toBeInTheDocument();
  });

  it('still shows a failure in danger styling', () => {
    render(<SyncMessage message={message({ status: 'FAILED_PERMANENT', error: 'Decrypt failed' })} />);
    expect(screen.getByText('Decrypt failed').className).toMatch(/danger/);
  });
});
