import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { serverApi as api } from '@/lib/api/server';
import { renderWithQuery } from '@/test/renderWithQuery';

import { rowButtons } from './inboxRowsModel';
import { InboxScreen } from './InboxScreen';
import { action, DISMISS, inbox, item } from './inboxTestUtils';

const stale = item({
  key: 'link-suggestion:TRANSFER',
  kind: 'link_suggestion',
  rowType: 'summary',
  section: 'needs_look',
  title: 'Possible transfers',
  actions: [action({ type: 'review', label: 'Review', href: '/transactions/review' }), DISMISS],
});

describe('Inbox and link suggestions', () => {
  beforeEach(() => vi.resetAllMocks());

  it('no row button opens a suggestions review any more', () => {
    for (const button of rowButtons(stale)) expect(button).not.toHaveProperty('suggestions');
  });

  it('never asks the server for link suggestions', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: inbox([stale]) } as never);
    renderWithQuery(<InboxScreen />);
    await screen.findByText('Possible transfers');
    const urls = vi.mocked(api.GET).mock.calls.map((c) => c[0]);
    expect(urls.some((u) => String(u).includes('link-suggestions'))).toBe(false);
  });
});
