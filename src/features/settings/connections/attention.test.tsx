import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AttentionCard } from './AttentionCard';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } };
});

type Paged = Schemas['PageGmailAttentionItemResponse'];

const item = (over: Record<string, unknown>) => ({
  id: 'i1',
  gmailMessageId: 'm1',
  connectionEmail: 'arjun.mehta@gmail.test',
  senderAddress: 'alerts@uber.com',
  subject: 'Your Uber receipt',
  internalDate: '2026-10-10T10:00:00Z',
  discoveredAt: '2026-10-10T10:05:00Z',
  processedAt: '2026-10-11T09:00:00Z',
  status: 'UNRESOLVED_ACCOUNT',
  extractedLast4: '9999',
  attemptCount: 2,
  error: 'UNRESOLVED_ACCOUNT',
  ...over,
});

const page = (content: unknown[], over: Record<string, unknown> = {}): Paged =>
  ({ content, totalElements: content.length, totalPages: 1, number: 0, size: 10, ...over }) as unknown as Paged;

function setup(over: Partial<React.ComponentProps<typeof AttentionCard>> = {}) {
  const props = {
    attentionData: page([item({})]),
    attentionPage: 0,
    onPageChange: vi.fn(),
    archivedData: null,
    archivedPage: 0,
    onArchivedPageChange: vi.fn(),
    onRetryItem: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    ...over,
  };
  renderWithQuery(<AttentionCard {...props} />);
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.GET).mockResolvedValue({ data: [{ id: 'acc-1', name: 'HDFC Bank' }, { id: 'acc-2', name: 'ICICI' }] } as never);
});

describe('AttentionCard', () => {
  it('shows the count, the label, date and sender, the subject and the plain-words summary', () => {
    setup();
    expect(screen.getByText('Needs attention · 1')).toBeInTheDocument();
    expect(screen.getByText('Emails that could not become transactions')).toBeInTheDocument();
    expect(screen.getByText('No matching account')).toBeInTheDocument();
    expect(screen.getByText('10 Oct · alerts@uber.com')).toBeInTheDocument();
    expect(screen.getByText('Your Uber receipt')).toBeInTheDocument();
    expect(screen.getByText(/none of your accounts \(or more than one\) match it/)).toBeInTheDocument();
  });

  it('falls back to (no subject)', () => {
    setup({ attentionData: page([item({ subject: null })]) });
    expect(screen.getByText('(no subject)')).toBeInTheDocument();
  });

  it('shows Assign only for an unresolved account with a last4', () => {
    setup({
      attentionData: page([
        item({ id: 'a' }),
        item({ id: 'b', status: 'UNRESOLVED_ACCOUNT', extractedLast4: null }),
        item({ id: 'c', status: 'FAILED_PERMANENT' }),
      ]),
    });
    expect(screen.getAllByRole('button', { name: 'Assign' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Archive' })).toHaveLength(3);
  });

  it('retries and archives an item', () => {
    const p = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(p.onRetryItem).toHaveBeenCalledWith('i1');
    expect(p.onArchive).toHaveBeenCalledWith('i1');
  });

  it('opens and hides the details list with every field', () => {
    setup({ attentionData: page([item({ accountName: 'HDFC Regalia' })]) });
    expect(screen.queryByTestId('attention-details')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    const d = screen.getByTestId('attention-details');
    for (const text of ['Mailbox', 'arjun.mehta@gmail.test', 'From', 'Email date', 'Card', '••9999', 'Account', 'HDFC Regalia', 'First seen', 'Last tried', 'Attempts', 'Error']) {
      expect(d).toHaveTextContent(text);
    }
    expect(d).toHaveTextContent('10 Oct 2026');
    const link = screen.getByRole('link', { name: 'Open in Gmail' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('href')).toContain('authuser=arjun.mehta%40gmail.test');
    fireEvent.click(screen.getByRole('button', { name: 'Hide details' }));
    expect(screen.queryByTestId('attention-details')).toBeNull();
  });

  it('assigns an account and remembers it', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: { reactivatedCount: 0 } } as never);
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    expect(await screen.findByText('Assign account identifier')).toBeInTheDocument();
    expect(screen.getByText('••9999')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Assign & remember' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Assign & remember' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/gmail/attention/{ledgerId}/assign',
        expect.objectContaining({ body: { accountId: 'acc-1' } }),
      ),
    );
    await waitFor(() => expect(screen.queryByText('Assign account identifier')).toBeNull());
  });

  it('shows the inline error when assigning fails', async () => {
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Assign & remember' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Assign & remember' }));
    expect(await screen.findByText(/boom|Failed to assign identifier to account/)).toBeInTheDocument();
    expect(screen.getByText('Assign account identifier')).toBeInTheDocument();
  });

  it('switches to the archived list and back, with Unarchive', () => {
    const p = setup({ archivedData: page([item({ id: 'z', archivedAt: '2026-10-03T10:00:00Z', subject: 'Old SBI alert' })], { totalElements: 3 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Archived · 3' }));
    expect(screen.getByText('Archived · 3')).toBeInTheDocument();
    expect(screen.getByText('Kept out of Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Old SBI alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Unarchive' }));
    expect(p.onUnarchive).toHaveBeenCalledWith('z');
    fireEvent.click(screen.getByRole('button', { name: 'Back to needs attention' }));
    expect(screen.getByText('Needs attention · 1')).toBeInTheDocument();
  });

  it('shows no Archived link when nothing is archived', () => {
    setup();
    expect(screen.queryByRole('button', { name: /^Archived/ })).toBeNull();
  });

  it('pages the active list with the pager above and below', () => {
    const p = setup({ attentionData: page([item({})], { totalElements: 12, totalPages: 2 }) });
    const nexts = screen.getAllByRole('button', { name: /next/i });
    expect(nexts).toHaveLength(2);
    fireEvent.click(nexts[0]);
    expect(p.onPageChange).toHaveBeenCalledWith(1);
    expect(screen.getAllByText('1–10 of 12')).toHaveLength(2);
  });

  it('gives the archived list its own pager', () => {
    const p = setup({ archivedData: page([item({ archivedAt: '2026-10-03T10:00:00Z' })], { totalElements: 12, totalPages: 2 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Archived · 12' }));
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(p.onArchivedPageChange).toHaveBeenCalledWith(1);
    expect(p.onPageChange).not.toHaveBeenCalled();
  });

  it('scrolls into view for the deep link', () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    setup({ autoScroll: true });
    expect(scroll).toHaveBeenCalled();
  });

  it('says nothing needs attention when the list is empty', () => {
    setup({ attentionData: page([], { totalElements: 0, totalPages: 0 }) });
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('Nothing needs attention right now.')).toBeInTheDocument();
  });
});
