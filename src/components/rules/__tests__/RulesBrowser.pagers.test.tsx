import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RulesBrowser } from '@/components/rules/RulesBrowser';
import { api } from '@/lib/api/client';
import { expectPagersAroundList } from '@/test/pagers';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/rules',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api/client', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/client')>(
      '@/lib/api/client'
    );
  return {
    ...actual,
    api: {
      GET: vi.fn(),
      POST: vi.fn(),
      PUT: vi.fn(),
      PATCH: vi.fn(),
      DELETE: vi.fn(),
    },
  };
});
// The mobile filter sheet, rendered in place so a pager inside it would show up.
vi.mock('@/components/layout/PageActionBarContext', () => ({
  PageActionBar: ({ children }: { children: ReactNode }) => (
    <div data-testid="mobile-bar">{children}</div>
  ),
}));

const rule = {
  id: 'r1',
  merchantKey: 'SWIGGY',
  matchType: 'MERCHANT_KEY',
  displayName: 'Swiggy',
  categories: [{ id: 'c1', name: 'Food' }],
  verified: false,
  source: 'USER',
  appliedCount: 3,
  lastAppliedAt: null,
  createdAt: '2026-08-01T00:00:00Z',
  mcc: null,
};

type Query = { page?: number };
function serve(total: number) {
  vi.mocked(api.GET).mockImplementation((async (
    url: string,
    opts?: { params?: { query?: Query } }
  ) => {
    if (url === '/api/v1/rules')
      return {
        data: {
          content: total ? [rule] : [],
          totalElements: total,
          totalPages: Math.ceil(total / 50),
          size: 50,
          number: opts?.params?.query?.page ?? 0,
          first: true,
          last: false,
          empty: !total,
        },
      };
    if (url === '/api/v1/categories') return { data: [] };
    if (url === '/api/v1/jobs') return { data: { content: [] } };
    return { data: null };
  }) as never);
}
const lastRulesPage = () =>
  vi
    .mocked(api.GET)
    .mock.calls.filter((c) => c[0] === '/api/v1/rules')
    .map(
      (c) => (c[1] as unknown as { params: { query: Query } }).params.query.page
    )
    .at(-1);

describe('Rules pagers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the pager above and below the rules, outside the desktop and mobile filter bars', async () => {
    serve(120);
    renderWithQuery(<RulesBrowser />);
    const card = await screen.findByText('Swiggy');
    expectPagersAroundList(
      card,
      screen.getAllByPlaceholderText('Search merchant keys or display names...')
    );
    expect(
      within(screen.getByTestId('mobile-bar')).queryByRole('navigation')
    ).toBeNull();
  });

  it('pages from the bottom pager', async () => {
    serve(120);
    renderWithQuery(<RulesBrowser />);
    await screen.findByText('Swiggy');
    const bottom = screen.getAllByRole('navigation', { name: 'Pagination' })[1];
    fireEvent.click(within(bottom).getByRole('button', { name: 'Page 3' }));
    await waitFor(() => expect(lastRulesPage()).toBe(2));
  });

  it('shows no pager with the empty state', async () => {
    serve(0);
    renderWithQuery(<RulesBrowser />);
    await screen.findByText('No categorization rules found');
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
    expect(screen.queryByText('0 rules')).toBeNull();
  });
});
