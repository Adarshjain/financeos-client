import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  };
});
vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);
vi.mock('@/components/layout/PageActionBarContext', () => ({ PageActionBar: () => null }));
vi.mock('@/app/(protected)/investments/CreateInstrumentDialog', () => ({ CreateInstrumentDialog: () => null }));

import { InstrumentsSection } from '@/app/(protected)/investments/InstrumentsSection';
import { api } from '@/lib/api/client';
import type { InstrumentListPage } from '@/lib/instrumentList';
import type { Instrument } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

const inst = (name: string): Instrument => ({ id: `id-${name}`, name, type: 'stock', currency: 'INR' });

type Query = { search?: string; type?: string; sort?: string; page?: number; size?: number };
const lastQuery = (): Query =>
  (vi.mocked(api.GET).mock.calls.at(-1)?.[1] as unknown as { params: { query: Query } }).params.query;

/** The server's answer: `names` sorted by the requested direction, with `total` over `totalPages`. */
function serve(names: string[], total = names.length, totalPages = 1) {
  vi.mocked(api.GET).mockImplementation((async (_path: string, opts: { params: { query: Query } }) => {
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    if (opts.params.query.sort === 'name,desc') sorted.reverse();
    const page: InstrumentListPage = {
      items: sorted.map(inst),
      page: opts.params.query.page ?? 0,
      size: opts.params.query.size ?? 50,
      totalElements: total,
      totalPages,
    };
    return { data: page };
  }) as never);
}

/** Names of the table rows, top to bottom. */
function tableNames(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => ['Alpha', 'Mid', 'Zulu'].find((n) => r.textContent?.includes(n)) ?? '?');
}

describe('InstrumentsSection — count and server-side name sort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('heads the page with the total over all pages, not the rows on this one', async () => {
    serve(['Alpha', 'Mid'], 1234, 25);
    renderWithQuery(<InstrumentsSection />);
    expect(await screen.findByRole('heading', { name: 'Instruments (1,234)' })).toBeInTheDocument();
    expect(screen.getByText('1 / 25')).toBeInTheDocument();
  });

  it('shows no count until the first answer, and (0) for an empty catalog', async () => {
    let resolve: (v: unknown) => void = () => {};
    vi.mocked(api.GET).mockReturnValue(new Promise((r) => (resolve = r)) as never);
    renderWithQuery(<InstrumentsSection />);
    expect(screen.getByRole('heading', { name: 'Instruments' })).toBeInTheDocument();
    resolve({ data: { items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 } });
    expect(await screen.findByRole('heading', { name: 'Instruments (0)' })).toBeInTheDocument();
  });

  it('the count follows the search: it is the number of matches', async () => {
    vi.mocked(api.GET).mockImplementation((async (_path: string, opts: { params: { query: Query } }) => ({
      data: opts.params.query.search
        ? { items: [inst('Mid')], page: 0, size: 50, totalElements: 1, totalPages: 1 }
        : { items: [inst('Alpha'), inst('Mid')], page: 0, size: 50, totalElements: 80, totalPages: 2 },
    })) as never);
    renderWithQuery(<InstrumentsSection />);
    expect(await screen.findByRole('heading', { name: 'Instruments (80)' })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search by ticker, name, ISIN...'), { target: { value: 'mid' } });
    expect(await screen.findByRole('heading', { name: 'Instruments (1)' })).toBeInTheDocument();
  });

  it('starts A–Z (no sort sent) and toggles to Z–A and back on the server', async () => {
    serve(['Zulu', 'Alpha', 'Mid']);
    renderWithQuery(<InstrumentsSection />);
    expect((await screen.findAllByText('Alpha')).length).toBeGreaterThan(0);
    expect(lastQuery()).toEqual({ page: 0, size: 50 });
    expect(tableNames()).toEqual(['Alpha', 'Mid', 'Zulu']);

    fireEvent.click(screen.getByRole('button', { name: 'Name A–Z' }));
    await waitFor(() => expect(tableNames()).toEqual(['Zulu', 'Mid', 'Alpha']));
    expect(lastQuery()).toEqual({ sort: 'name,desc', page: 0, size: 50 });
    expect(screen.getByRole('button', { name: 'Name Z–A' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Name Z–A' }));
    await waitFor(() => expect(tableNames()).toEqual(['Alpha', 'Mid', 'Zulu']));
    expect(lastQuery()).toEqual({ page: 0, size: 50 });
  });

  it('changing the sort goes back to the first page and keeps the search and type', async () => {
    serve(['Alpha', 'Mid'], 120, 3);
    renderWithQuery(<InstrumentsSection />);
    expect((await screen.findAllByText('Alpha')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 1, size: 50 }));
    fireEvent.click(screen.getByRole('option', { name: 'ETF' }));
    fireEvent.change(screen.getByPlaceholderText('Search by ticker, name, ISIN...'), { target: { value: 'al' } });
    await waitFor(() => expect(lastQuery()).toEqual({ search: 'al', type: 'etf', page: 0, size: 50 }));

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastQuery()).toEqual({ search: 'al', type: 'etf', page: 1, size: 50 }));
    fireEvent.click(screen.getByRole('button', { name: 'Name A–Z' }));
    await waitFor(() =>
      expect(lastQuery()).toEqual({ search: 'al', type: 'etf', sort: 'name,desc', page: 0, size: 50 })
    );
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('hides prev/next when everything fits on one page', async () => {
    serve(['Alpha', 'Mid']);
    renderWithQuery(<InstrumentsSection />);
    expect(await screen.findByRole('heading', { name: 'Instruments (2)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Previous page' })).toBeNull();
  });
});
