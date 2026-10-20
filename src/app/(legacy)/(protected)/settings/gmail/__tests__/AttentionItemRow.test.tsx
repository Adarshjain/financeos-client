import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AttentionItem } from '../attentionItem.helpers';
import { AttentionItemRow } from '../AttentionItemRow';

function item(overrides: Partial<AttentionItem> = {}): AttentionItem {
  return {
    id: 'ledger-1',
    gmailMessageId: 'msg-abc',
    subject: 'Credit Card Transaction Alert',
    senderAddress: 'alerts@bank.example',
    internalDate: '2026-10-01T04:30:00Z',
    status: 'FAILED_PERMANENT',
    error: 'Extraction failed: No active LLM API keys configured. Add an API key in Settings.',
    attemptCount: 3,
    discoveredAt: '2026-10-01T05:00:00Z',
    processedAt: '2026-10-02T06:00:00Z',
    connectionEmail: 'me@gmail.com',
    ...overrides,
  } as AttentionItem;
}

function renderRow(overrides: Partial<AttentionItem> = {}) {
  const handlers = { onRetry: vi.fn(), onAssign: vi.fn(), onArchive: vi.fn(), onUnarchive: vi.fn() };
  render(
    <ul>
      <AttentionItemRow item={item(overrides)} {...handlers} />
    </ul>
  );
  return handlers;
}

describe('AttentionItemRow', () => {
  it('shows the plain-words label, summary, hint, sender and subject', () => {
    renderRow();
    expect(screen.getByText('No AI key')).toBeInTheDocument();
    expect(screen.getByText(/no AI key was set up/)).toBeInTheDocument();
    expect(screen.getByText(/AI keys & routing/)).toBeInTheDocument();
    expect(screen.getByText('alerts@bank.example')).toBeInTheDocument();
    expect(screen.getByText('Credit Card Transaction Alert')).toBeInTheDocument();
  });

  it('falls back to "(no subject)"', () => {
    renderRow({ subject: null });
    expect(screen.getByText('(no subject)')).toBeInTheDocument();
  });

  it('keeps details hidden until toggled, then shows mailbox, raw error, attempts and the Gmail link', () => {
    renderRow();
    const toggle = screen.getByRole('button', { name: 'Details' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Mailbox')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('me@gmail.com')).toBeInTheDocument();
    expect(screen.getByText(/No active LLM API keys configured/)).toBeInTheDocument();
    const attempts = screen.getByText('Attempts').parentElement!;
    expect(within(attempts).getByText('3')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Open in Gmail' });
    expect(link).toHaveAttribute('href', 'https://mail.google.com/mail/?authuser=me%40gmail.com#all/msg-abc');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('omits the attempts row for an item that was parked without a processing attempt', () => {
    renderRow({ status: 'UNRESOLVED_ACCOUNT', attemptCount: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.queryByText('Attempts')).not.toBeInTheDocument();
  });

  it('lists the account and card number in details only when known', () => {
    renderRow({ status: 'ACCOUNT_NOT_OPTED_IN', accountName: 'HSBC Live+', extractedLast4: '9876' });
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('••9876')).toBeInTheDocument();
  });

  it('omits the account and card rows when unknown', () => {
    renderRow({ accountName: null, extractedLast4: null });
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.queryByText('Account')).not.toBeInTheDocument();
    expect(screen.queryByText('Card / a/c')).not.toBeInTheDocument();
  });

  it('active rows offer Retry and Archive, and Assign only for an unresolved item with a card number', () => {
    const h = renderRow({ status: 'UNRESOLVED_ACCOUNT', extractedLast4: '1234' });
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    fireEvent.click(screen.getByRole('button', { name: /Archive/ }));
    fireEvent.click(screen.getByRole('button', { name: /Assign/ }));
    expect(h.onRetry).toHaveBeenCalledWith('ledger-1');
    expect(h.onArchive).toHaveBeenCalledWith('ledger-1');
    expect(h.onAssign).toHaveBeenCalledWith(expect.objectContaining({ id: 'ledger-1' }));
    expect(screen.queryByRole('button', { name: /Unarchive/ })).not.toBeInTheDocument();
  });

  it('archived rows offer only Unarchive and show when they were archived', () => {
    const h = renderRow({ archivedAt: '2026-10-05T10:00:00Z', status: 'UNRESOLVED_ACCOUNT', extractedLast4: '1234' });
    expect(screen.queryByRole('button', { name: /Retry/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Archive$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Assign/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Unarchive/ }));
    expect(h.onUnarchive).toHaveBeenCalledWith('ledger-1');

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });
});
