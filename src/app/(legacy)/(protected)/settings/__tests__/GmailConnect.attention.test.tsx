import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Schemas } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

type Paged = Schemas['PageGmailAttentionItemResponse'];

const state = vi.hoisted(() => ({
  attentionData: null as unknown,
  archivedData: null as unknown,
}));

vi.mock('../gmail/useGmailConnect', () => ({
  useGmailConnect: () => ({
    loading: false,
    connections: [],
    senders: [],
    attentionData: state.attentionData,
    attentionPage: 0,
    setAttentionPage: vi.fn(),
    archivedData: state.archivedData,
    archivedPage: 0,
    setArchivedPage: vi.fn(),
    message: null,
    handleRetryAttentionItem: vi.fn(),
    handleArchiveAttentionItem: vi.fn(),
    handleUnarchiveAttentionItem: vi.fn(),
  }),
}));
vi.mock('@/components/jobs/JobsPanel', () => ({ JobsPanel: () => null }));
vi.mock('../gmail/GmailConnectionsCard', () => ({ GmailConnectionsCard: () => null }));
vi.mock('../gmail/GmailSendersCard', () => ({ GmailSendersCard: () => null }));
vi.mock('../gmail/GmailSenderDialog', () => ({ GmailSenderDialog: () => null }));

import { GmailConnect } from '../GmailConnect';

function page(content: unknown[]): Paged {
  return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0 } as unknown as Paged;
}

const item = (id: string, archivedAt: string | null = null) => ({
  id,
  gmailMessageId: `msg-${id}`,
  subject: `Alert ${id}`,
  status: 'FAILED_PERMANENT',
  attemptCount: 3,
  discoveredAt: '2026-10-01T00:00:00Z',
  connectionEmail: 'me@gmail.com',
  archivedAt,
});

describe('GmailConnect Needs Attention card', () => {
  it('keeps the card open when archiving the last item briefly empties both lists', () => {
    state.attentionData = page([item('a1')]);
    state.archivedData = page([]);
    const { rerender } = renderWithQuery(<GmailConnect />);
    fireEvent.click(screen.getByRole('button', { name: /Needs Attention/ }));

    // Active list refetched first, archived list not yet.
    state.attentionData = page([]);
    rerender(<GmailConnect />);
    expect(screen.queryByRole('button', { name: /Needs Attention/ })).not.toBeInTheDocument();

    state.archivedData = page([item('a1', '2026-10-05T00:00:00Z')]);
    rerender(<GmailConnect />);
    expect(screen.getByRole('button', { name: /Needs Attention/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders no card before the attention list has loaded', () => {
    state.attentionData = null;
    state.archivedData = page([item('z1', '2026-10-05T00:00:00Z')]);
    renderWithQuery(<GmailConnect />);
    expect(screen.queryByRole('button', { name: /Needs Attention/ })).not.toBeInTheDocument();
  });
});
