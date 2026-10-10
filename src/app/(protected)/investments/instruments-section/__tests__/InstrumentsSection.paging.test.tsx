import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { type InstrumentListPage, instrumentListQuery } from '@/lib/instrumentList';
import type { Instrument } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

function inst(i: number): Instrument {
  return { id: `inst-${i}`, name: `Instrument ${i}`, type: 'stock', currency: 'INR' };
}
const rows = (from: number, n: number) => Array.from({ length: n }, (_, k) => inst(from + k));
/** One GET /instruments page: `items` on page `page` of a list of `total` rows in pages of `size`. */
const pageOf = (items: Instrument[], total = items.length, page = 0, size = 50): InstrumentListPage => ({
  items,
  page,
  size,
  totalElements: total,
  totalPages: Math.ceil(total / size),
});

type Query = { search?: string; type?: string; sort?: string; page?: number; size?: number };
const lastQuery = (): Query =>
  (vi.mocked(api.GET).mock.calls.at(-1)?.[1] as unknown as { params: { query: Query } }).params.query;

describe('instrumentListQuery', () => {
  it('defaults to the first page of 50 and drops a blank search', () => {
    expect(instrumentListQuery()).toEqual({ page: 0, size: 50 });
    expect(instrumentListQuery({ search: '   ' })).toEqual({ page: 0, size: 50 });
  });

  it('trims the search, keeps the type and clamps page/size to the server limits', () => {
    expect(instrumentListQuery({ search: ' tcs ', type: 'etf', page: -2, size: 1000 })).toEqual({
      search: 'tcs',
      type: 'etf',
      page: 0,
      size: 200,
    });
    expect(instrumentListQuery({ size: 0 })).toEqual({ page: 0, size: 1 });
  });

  it('sends a sort only for name descending (ascending is the server default)', () => {
    expect(instrumentListQuery({ sortDir: 'asc' })).toEqual({ page: 0, size: 50 });
    expect(instrumentListQuery({ sortDir: 'desc', page: 2 })).toEqual({ sort: 'name,desc', page: 2, size: 50 });
  });
});

describe('InstrumentsSection — server-side paging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks the server for the first page of 50 only, never the whole catalog', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: pageOf(rows(1, 3)) } as never);
    renderWithQuery(<InstrumentsSection />);
    expect((await screen.findAllByText('Instrument 1')).length).toBeGreaterThan(0);
    expect(api.GET).toHaveBeenCalledWith('/api/v1/instruments', { params: { query: { page: 0, size: 50 } } });
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
  });

  it('pages forward and back on the server up to the last page', async () => {
    vi.mocked(api.GET).mockImplementation((async (_path: string, opts: { params: { query: Query } }) => ({
      data: opts.params.query.page === 0 ? pageOf(rows(1, 50), 57) : pageOf(rows(51, 7), 57, 1),
    })) as never);
    renderWithQuery(<InstrumentsSection />);
    expect((await screen.findAllByText('Instrument 50')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect((await screen.findAllByText('Instrument 57')).length).toBeGreaterThan(0);
    expect(lastQuery()).toEqual({ page: 1, size: 50 });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect((await screen.findAllByText('Instrument 1')).length).toBeGreaterThan(0);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('sends the search to the server (debounced) and goes back to the first page', async () => {
    vi.mocked(api.GET).mockImplementation((async (_path: string, opts: { params: { query: Query } }) => ({
      data: opts.params.query.search
        ? pageOf([inst(999)])
        : opts.params.query.page === 0
          ? pageOf(rows(1, 50), 52)
          : pageOf(rows(51, 2), 52, 1),
    })) as never);
    renderWithQuery(<InstrumentsSection />);
    expect((await screen.findAllByText('Instrument 1')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect((await screen.findAllByText('Instrument 52')).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText('Search by ticker, name, ISIN...'), { target: { value: 'reli' } });
    expect((await screen.findAllByText('Instrument 999')).length).toBeGreaterThan(0);
    expect(lastQuery()).toEqual({ search: 'reli', page: 0, size: 50 });
  });

  it('sends the type filter to the server and offers only the server types', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: pageOf(rows(1, 2)) } as never);
    renderWithQuery(<InstrumentsSection />);
    expect((await screen.findAllByText('Instrument 1')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('option', { name: 'Other' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'ETF' }));
    await waitFor(() => expect(lastQuery()).toEqual({ type: 'etf', page: 0, size: 50 }));
  });

  it('changes the page size on the server (capped list of sizes) and resets to the first page', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: pageOf(rows(1, 2)) } as never);
    renderWithQuery(<InstrumentsSection />);
    expect((await screen.findAllByText('Instrument 1')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('option', { name: '500 / page' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: '200 / page' }));
    await waitFor(() => expect(lastQuery()).toEqual({ page: 0, size: 200 }));
  });

  it('shows the empty-catalog state only for an unfiltered empty first page', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: pageOf([]) } as never);
    renderWithQuery(<InstrumentsSection />);
    expect(await screen.findByText('No instruments recorded yet')).toBeInTheDocument();
  });

  it('shows "no match" (not the empty-catalog state) when a search finds nothing', async () => {
    vi.mocked(api.GET).mockImplementation((async (_path: string, opts: { params: { query: Query } }) => ({
      data: opts.params.query.search ? pageOf([]) : pageOf(rows(1, 2)),
    })) as never);
    renderWithQuery(<InstrumentsSection />);
    expect((await screen.findAllByText('Instrument 1')).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByPlaceholderText('Search by ticker, name, ISIN...'), { target: { value: 'zzz' } });
    expect(await screen.findByText('No instruments match your search or filter.')).toBeInTheDocument();
    expect(screen.queryByText('No instruments recorded yet')).toBeNull();
  });

  it('shows an error state when the page fails to load', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('down'));
    renderWithQuery(<InstrumentsSection />);
    expect(await screen.findByText(/Couldn.t load instruments/)).toBeInTheDocument();
  });

  it('says "No more instruments" on an empty later page', async () => {
    vi.mocked(api.GET).mockImplementation((async (_path: string, opts: { params: { query: Query } }) => ({
      // The list shrank after the first page loaded: the second page comes back empty.
      data: opts.params.query.page === 0 ? pageOf(rows(1, 50), 51) : pageOf([], 50, 1),
    })) as never);
    renderWithQuery(<InstrumentsSection />);
    expect((await screen.findAllByText('Instrument 1')).length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    });
    expect(await screen.findByText('No more instruments.')).toBeInTheDocument();
  });
});
