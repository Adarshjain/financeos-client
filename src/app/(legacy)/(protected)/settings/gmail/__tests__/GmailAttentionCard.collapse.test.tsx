import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GmailAttentionCard } from '@/app/(legacy)/(protected)/settings/gmail/GmailAttentionCard';
import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } };
});

type Paged = Schemas['PageGmailAttentionItemResponse'];

function row(id: string, subject: string, archivedAt: string | null = null) {
  return {
    id,
    gmailMessageId: `msg-${id}`,
    subject,
    status: 'FAILED_PERMANENT',
    attemptCount: 3,
    discoveredAt: '2026-10-01T00:00:00Z',
    connectionEmail: 'me@gmail.com',
    archivedAt,
  };
}

function page(content: ReturnType<typeof row>[], totalPages = 1, number = 0): Paged {
  return { content, totalElements: content.length * totalPages, totalPages, number } as unknown as Paged;
}

const empty = page([]);
const active = page([row('a1', 'Active alert')]);
const archived = page([row('z1', 'Archived alert', '2026-10-05T00:00:00Z')]);

function renderCard(props: Partial<React.ComponentProps<typeof GmailAttentionCard>> = {}) {
  const handlers = {
    onPageChange: vi.fn(),
    onRetry: vi.fn(),
    onArchivedPageChange: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
  };
  renderWithQuery(
    <GmailAttentionCard attentionData={active} attentionPage={0} archivedData={empty} {...handlers} {...props} />
  );
  return handlers;
}

const header = () => screen.getByRole('button', { name: /Needs Attention/ });

describe('GmailAttentionCard collapse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
  });

  it('is collapsed by default, showing only the header with the active count', () => {
    renderCard();
    expect(header()).toHaveAttribute('aria-expanded', 'false');
    expect(header()).toHaveTextContent('Needs Attention (1)');
    expect(screen.queryByText('Active alert')).not.toBeInTheDocument();
  });

  it('expands and collapses from the header', () => {
    renderCard();
    fireEvent.click(header());
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Active alert')).toBeInTheDocument();

    fireEvent.click(header());
    expect(screen.queryByText('Active alert')).not.toBeInTheDocument();
  });

  it('opens by itself when deep-linked from the attention push', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
    renderCard({ autoScroll: true });
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Active alert')).toBeInTheDocument();
  });

  it('stays open when the lists are briefly both empty while they refetch after an archive', () => {
    const props = { attentionPage: 0, onPageChange: vi.fn(), onRetry: vi.fn() };
    const { rerender } = renderWithQuery(<GmailAttentionCard attentionData={active} archivedData={empty} {...props} />);
    fireEvent.click(header());

    rerender(<GmailAttentionCard attentionData={empty} archivedData={empty} {...props} />);
    rerender(<GmailAttentionCard attentionData={empty} archivedData={archived} {...props} />);

    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Nothing needs attention right now.')).toBeInTheDocument();
  });

  it('archives an active row', () => {
    const h = renderCard();
    fireEvent.click(header());
    fireEvent.click(screen.getByRole('button', { name: /^Archive$/ }));
    expect(h.onArchive).toHaveBeenCalledWith('a1');
  });
});

describe('GmailAttentionCard archived section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
  });

  it('has no archived toggle when nothing is archived', () => {
    renderCard();
    fireEvent.click(header());
    expect(screen.queryByRole('button', { name: /Archived/ })).not.toBeInTheDocument();
  });

  it('keeps archived rows behind their own collapsed toggle', () => {
    const h = renderCard({ archivedData: archived });
    fireEvent.click(header());
    const toggle = screen.getByRole('button', { name: 'Archived (1)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Archived alert')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText('Archived alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Unarchive/ }));
    expect(h.onUnarchive).toHaveBeenCalledWith('z1');
  });

  it('still renders when only archived items exist', () => {
    renderCard({ attentionData: empty, archivedData: archived });
    expect(header()).toHaveTextContent('Needs Attention (0)');
    fireEvent.click(header());
    expect(screen.getByText('Nothing needs attention right now.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archived (1)' })).toBeInTheDocument();
  });

  it('renders nothing when there are neither active nor archived items', () => {
    const { container } = renderWithQuery(
      <GmailAttentionCard attentionData={empty} attentionPage={0} archivedData={empty} onPageChange={vi.fn()} onRetry={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('pages the archived list on its own pager', () => {
    const h = renderCard({ archivedData: page([row('z1', 'Archived alert', '2026-10-05T00:00:00Z')], 2, 0) });
    fireEvent.click(header());
    fireEvent.click(screen.getByRole('button', { name: /Archived/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(h.onArchivedPageChange).toHaveBeenCalledWith(1);
    expect(h.onPageChange).not.toHaveBeenCalled();
  });
});
