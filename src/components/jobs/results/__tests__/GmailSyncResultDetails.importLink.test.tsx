import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SyncMessageOutcome, SyncSummary } from '@/lib/types';

import { GmailSyncResultDetails } from '../GmailSyncResultDetails';

function outcome(o: SyncMessageOutcome['outcome']): SyncMessageOutcome {
  return {
    gmailMessageId: 'm1',
    from: 'Bank <a@b.com>',
    subject: 'Stmt',
    receivedAt: '2026-10-01T00:00:00Z',
    outcome: o,
    reason: 'r',
  };
}

function renderWith(o: SyncMessageOutcome['outcome']) {
  const result = { discovered: 1, attention: [outcome(o)] } as unknown as SyncSummary;
  render(<GmailSyncResultDetails result={result} />);
  fireEvent.click(screen.getByText(/Needs attention/));
}

describe('GmailSyncResultDetails manual import link', () => {
  it.each(['PARSE_FAILED', 'NO_ATTACHMENT'] as const)('%s links to /transactions/import', (o) => {
    renderWith(o);
    const links = screen.getAllByRole('link', { name: 'Import manually', hidden: true });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((l) => expect(l).toHaveAttribute('href', '/transactions/import'));
  });

  it.each(['EXTRACTION_FAILED', 'ERROR'] as const)('%s has no import link', (o) => {
    renderWith(o);
    expect(screen.queryByRole('link', { name: 'Import manually', hidden: true })).not.toBeInTheDocument();
  });
});
