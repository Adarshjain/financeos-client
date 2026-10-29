import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bonus, demerger, pageOf, split } from '@/features/investments/corporate-actions/corporateActions.fixtures';
import { ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsCorporateActionsPage from './page';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({ redirect, useRouter: () => router, usePathname: () => '/investments/corporate-actions' }));

const server = vi.hoisted(() => ({ fetchCorporateActionsPage: vi.fn(), fetchCorporateActionPreview: vi.fn() }));
vi.mock('@/features/investments/corporate-actions/corporateActionsServerApi', () => server);
vi.mock('@/features/investments/corporate-actions/corporateActionsActions', () => ({ loadCorporateActionPreview: vi.fn().mockResolvedValue({ success: true, data: { holdings: [] } }) }));
vi.mock('@/features/investments/instruments/useCatalogSearch', () => ({
  useCatalogSearch: () => ({ results: [], isLoading: false, hasQuery: false }),
  useResolveInstrumentMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const api = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

async function renderPage(query: Record<string, string> = {}) {
  const ui = await DsCorporateActionsPage({ searchParams: Promise.resolve(query) });
  return renderWithQuery(ui);
}

beforeEach(() => {
  vi.clearAllMocks();
  server.fetchCorporateActionsPage.mockResolvedValue(pageOf([bonus, split]));
});

describe('/investments/corporate-actions', () => {
  it('asks the server for the page the address names', async () => {
    server.fetchCorporateActionsPage.mockResolvedValue(pageOf([bonus], { page: 1, size: 50, totalElements: 80, totalPages: 2 }));
    await renderPage({ q: 'infy', type: 'bonus', sort: 'name', page: '2', size: '50' });
    expect(server.fetchCorporateActionsPage).toHaveBeenCalledWith({ type: 'bonus', search: 'infy', sort: 'name', page: 1, size: 50 });
  });

  it('lists the actions with date, instrument, type, ratio and effect', async () => {
    await renderPage();
    expect(server.fetchCorporateActionsPage).toHaveBeenCalledWith({ type: undefined, search: undefined, sort: 'newest', page: 0, size: 25 });
    for (const text of ['INFY · Infosys', '10 Jun 2025', 'Bonus', '1 : 1', /30 → 60/]) expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Note: record date 11 Jun 25').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ITC').length).toBeGreaterThan(0);
  });

  it('explains how each type is applied', async () => {
    await renderPage();
    expect(screen.getByText('How each type is applied')).toBeInTheDocument();
    expect(screen.getByText('Quantity multiplies, cost per share divides, total cost unchanged')).toBeInTheDocument();
    expect(screen.getByText('Floored; the fraction is sold as cash-in-lieu')).toBeInTheDocument();
  });

  it('puts a type chip in the address and goes back to the first page', async () => {
    server.fetchCorporateActionsPage.mockResolvedValue(pageOf([bonus], { page: 1, totalElements: 30, totalPages: 2 }));
    await renderPage({ page: '2' });
    fireEvent.click(screen.getByRole('button', { name: 'Demerger' }));
    expect(router.push).toHaveBeenCalledWith('/investments/corporate-actions?type=demerger', { scroll: false });
  });

  it('puts a sort choice in the address', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Newest/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Oldest' }));
    expect(router.push).toHaveBeenCalledWith('/investments/corporate-actions?sort=oldest', { scroll: false });
  });

  it('puts the search in the address once typing has paused', async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'itc' } });
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/investments/corporate-actions?q=itc', { scroll: false }));
  });

  it('shows a page past the end as the last page', async () => {
    server.fetchCorporateActionsPage.mockResolvedValue(pageOf([], { page: 5, totalElements: 30, totalPages: 2 }));
    await expect(renderPage({ page: '6' })).rejects.toThrow('REDIRECT /investments/corporate-actions?page=2');
  });

  it('says nothing is recorded yet', async () => {
    server.fetchCorporateActionsPage.mockResolvedValue(pageOf([]));
    await renderPage();
    expect(screen.getByText(/No corporate actions yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('offers to clear the filters when none match', async () => {
    server.fetchCorporateActionsPage.mockResolvedValue(pageOf([]));
    await renderPage({ type: 'merger', q: 'zzz' });
    expect(screen.getByText('No corporate actions match')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenCalledWith('/investments/corporate-actions');
  });

  it('shows the load error instead of the list', async () => {
    server.fetchCorporateActionsPage.mockRejectedValue(new ApiError(500, { code: 'INTERNAL', message: 'boom' }));
    await renderPage();
    expect(screen.queryByText('How each type is applied')).toBeNull();
    expect(screen.getByText("Couldn't load corporate actions")).toBeInTheDocument();
  });

  it('opens a saved action in the edit dialog from its pencil and from its row', async () => {
    server.fetchCorporateActionsPage.mockResolvedValue(pageOf([demerger]));
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit ITC Demerger' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit corporate action')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getAllByText('ITC')[0]);
    expect(await screen.findByText('Edit corporate action')).toBeInTheDocument();
  });
});

describe('/investments/corporate-actions: filter row', () => {
  it('is a FilterBar: search first with the default placeholder, then the chips, carrying their own bleed', async () => {
    await renderPage();
    const row = screen.getByPlaceholderText('Search').closest('div.overflow-x-auto') as HTMLElement;
    expect(row).toHaveClass('scrollbar-none', '-mx-space-16', 'px-space-16', 'py-space-4');
    expect(row.querySelectorAll('button').length).toBeGreaterThan(0);
    expect(row.querySelector('input')).toBe(screen.getByPlaceholderText('Search'));
  });
});
