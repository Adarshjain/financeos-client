import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
vi.mock(
  '@/components/ui/select',
  async () => (await import('@/test/mockSelect')).selectMock
);
// The mobile filter sheet, rendered in place so a pager inside it would show up.
vi.mock('@/components/layout/PageActionBarContext', () => ({
  PageActionBar: ({ children }: { children: ReactNode }) => (
    <div data-testid="mobile-bar">{children}</div>
  ),
}));
vi.mock('@/app/(protected)/investments/CreateInstrumentDialog', () => ({
  CreateInstrumentDialog: () => null,
}));

import { InstrumentsSection } from '@/app/(protected)/investments/InstrumentsSection';
import { api } from '@/lib/api/client';
import type { InstrumentListPage } from '@/lib/instrumentList';
import type { Instrument } from '@/lib/types';
import { expectPagersAroundList } from '@/test/pagers';
import { renderWithQuery } from '@/test/renderWithQuery';

type Query = { page?: number; size?: number };
const inst = (name: string): Instrument => ({
  id: `id-${name}`,
  name,
  type: 'stock',
  currency: 'INR',
});
const answer = (
  items: Instrument[],
  total: number,
  page = 0
): { data: InstrumentListPage } => ({
  data: {
    items,
    page,
    size: 50,
    totalElements: total,
    totalPages: Math.ceil(total / 50),
  },
});
const lastQuery = (): Query =>
  (
    vi.mocked(api.GET).mock.calls.at(-1)?.[1] as unknown as {
      params: { query: Query };
    }
  ).params.query;

describe('Instruments pagers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the pager above and below the list, outside the desktop and mobile filter bars', async () => {
    vi.mocked(api.GET).mockResolvedValue(answer([inst('Alpha')], 120) as never);
    renderWithQuery(<InstrumentsSection />);
    const row = (await screen.findAllByText('Alpha'))[0];
    expectPagersAroundList(
      row,
      screen.getAllByPlaceholderText('Search by ticker, name, ISIN...')
    );
    expect(
      within(screen.getByTestId('mobile-bar')).queryByRole('navigation')
    ).toBeNull();
    expect(screen.getAllByText('1–50')).toHaveLength(2);
  });

  it('offers only the page sizes the server allows, on the top pager', async () => {
    vi.mocked(api.GET).mockResolvedValue(answer([inst('Alpha')], 120) as never);
    renderWithQuery(<InstrumentsSection />);
    await screen.findAllByText('Alpha');
    const sizes = screen
      .getAllByRole('option')
      .map((o) => o.textContent)
      .filter((t) => t?.endsWith('/ page'));
    expect(sizes).toEqual([
      '25 / page',
      '50 / page',
      '100 / page',
      '200 / page',
    ]);
  });

  it('jumps to a page from the bottom pager', async () => {
    vi.mocked(api.GET).mockResolvedValue(answer([inst('Alpha')], 120) as never);
    renderWithQuery(<InstrumentsSection />);
    await screen.findAllByText('Alpha');
    const bottom = screen.getAllByRole('navigation', { name: 'Pagination' })[1];
    fireEvent.click(within(bottom).getByRole('button', { name: 'Page 3' }));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 2, size: 50 }));
  });

  it('keeps the pager on an empty later page so you can step back', async () => {
    vi.mocked(api.GET).mockImplementation((async (
      _p: string,
      opts: { params: { query: Query } }
    ) =>
      // The list shrank after the first page loaded: the second page comes back empty.
      opts.params.query.page
        ? answer([], 50, 1)
        : answer([inst('Alpha')], 51)) as never);
    renderWithQuery(<InstrumentsSection />);
    await screen.findAllByText('Alpha');
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Next page' })[0]);
    });
    expect(await screen.findByText('No more instruments.')).toBeInTheDocument();
    const top = screen.getAllByRole('navigation', { name: 'Pagination' })[0];
    fireEvent.click(within(top).getByRole('button', { name: 'Previous page' }));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 0, size: 50 }));
  });
});
