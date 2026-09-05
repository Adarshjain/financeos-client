import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GmailAttentionCard } from '@/app/(protected)/settings/gmail/GmailAttentionCard';
import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } };
});

const mockAttentionData: Schemas['PageGmailAttentionItemResponse'] = {
  content: [
    {
      id: 'item-1',
      gmailMessageId: 'msg-1',
      subject: 'Transaction Alert',
      status: 'UNRESOLVED_ACCOUNT',
      extractedLast4: '1234',
      attemptCount: 1,
      discoveredAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'item-2',
      gmailMessageId: 'msg-2',
      subject: 'Unopted Alert',
      status: 'ACCOUNT_NOT_OPTED_IN',
      extractedLast4: '5678',
      attemptCount: 1,
      discoveredAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'item-3',
      gmailMessageId: 'msg-3',
      subject: 'Failed Alert',
      status: 'FAILED_PERMANENT',
      extractedLast4: null,
      attemptCount: 3,
      discoveredAt: '2026-09-01T00:00:00Z',
    },
  ],
  totalElements: 3,
  totalPages: 1,
  number: 0,
} as unknown as Schemas['PageGmailAttentionItemResponse'];

describe('GmailAttentionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({
      data: [{ id: 'acc-1', name: 'HDFC Bank', type: 'BANK_ACCOUNT' }],
    } as never);
  });

  it('shows Assign button only for UNRESOLVED_ACCOUNT with extractedLast4', () => {
    renderWithQuery(
      <GmailAttentionCard
        attentionData={mockAttentionData}
        attentionPage={0}
        onPageChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    const assignButtons = screen.getAllByRole('button', { name: /Assign/i });
    expect(assignButtons).toHaveLength(1);

    const retryButtons = screen.getAllByRole('button', { name: /Retry/i });
    expect(retryButtons).toHaveLength(3);
  });

  it('clicking Assign button opens AssignAccountDialog', async () => {
    renderWithQuery(
      <GmailAttentionCard
        attentionData={mockAttentionData}
        attentionPage={0}
        onPageChange={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    const assignBtn = screen.getByRole('button', { name: /Assign/i });
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Assign Account Identifier' })).toBeInTheDocument();
      expect(screen.getAllByText(/••1234/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
