import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CategoriesScreen } from './CategoriesScreen';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/ds/transactions/categories',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
const toasts = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({ ...(await orig<object>()), showToast: toasts.showToast }));
const http = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<object>()), api: http }));

const categories = [
  { id: 'c1', name: 'Food & dining' },
  { id: 'c2', name: 'Dining out' },
];

function stubLayout(phone: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: !phone && query.includes('min-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

const state = { q: '', page: 0 };
const pageOf = (rows: typeof categories, totalPages = 1) => ({ rows, totalElements: rows.length, totalPages });

describe('CategoriesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('lists every category without any numbers', () => {
    renderWithQuery(<CategoriesScreen categories={pageOf(categories)} state={state} />);
    expect(screen.getByText('Food & dining')).toBeTruthy();
    expect(screen.getByText('Dining out')).toBeTruthy();
    expect(screen.queryByText(/\d+ rules?|txns/i)).toBeNull();
  });

  it('shows the app wording when empty and when the load failed', () => {
    const { unmount } = renderWithQuery(<CategoriesScreen categories={pageOf([])} state={state} />);
    expect(screen.getByText('No categories found')).toBeTruthy();
    expect(screen.getByText('Get started by creating your first category.')).toBeTruthy();
    unmount();
    renderWithQuery(<CategoriesScreen categories={null} reference="r1" state={state} />);
    expect(screen.getByText('Could not load categories')).toBeTruthy();
  });

  it('desktop: the menu renames and a server error is a toast', async () => {
    stubLayout(false);
    http.PUT.mockRejectedValue(new ApiError(409, { message: 'A category with this name already exists.' } as never));
    renderWithQuery(<CategoriesScreen categories={pageOf(categories)} state={state} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for Dining out' }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    const input = await screen.findByLabelText('Name');
    fireEvent.change(input, { target: { value: 'Food & dining' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(toasts.showToast).toHaveBeenCalledWith('A category with this name already exists.', { tone: 'danger' }),
    );
    expect(screen.getByLabelText('Name')).toBeTruthy();
  });

  it('desktop: delete confirms first, then deletes and refreshes', async () => {
    stubLayout(false);
    http.DELETE.mockResolvedValue({});
    renderWithQuery(<CategoriesScreen categories={pageOf(categories)} state={state} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for Dining out' }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(await screen.findByText('Delete Dining out?')).toBeTruthy();
    expect(http.DELETE).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(http.DELETE).toHaveBeenCalled());
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(toasts.showToast).toHaveBeenCalledWith('Category "Dining out" deleted');
  });

  it('phone: tapping a row opens its actions, Rename continues to the rename form', async () => {
    stubLayout(true);
    renderWithQuery(<CategoriesScreen categories={pageOf(categories)} state={state} />);
    fireEvent.click(screen.getByText('Dining out'));
    fireEvent.click(await screen.findByRole('button', { name: 'Rename' }));
    expect(await screen.findByText('Rename category')).toBeTruthy();
  });

  it('desktop: clicking a row opens the same actions dialog as the phone', async () => {
    stubLayout(false);
    renderWithQuery(<CategoriesScreen categories={pageOf(categories)} state={state} />);
    fireEvent.click(screen.getByText('Dining out'));
    expect(await screen.findByRole('button', { name: 'Rename' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });

  it('desktop: the menu goes straight to its form without opening the row dialog', async () => {
    stubLayout(false);
    renderWithQuery(<CategoriesScreen categories={pageOf(categories)} state={state} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for Dining out' }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    expect(await screen.findByText('Rename category')).toBeTruthy();
    expect(screen.queryByText('Rename this category or delete it.')).toBeNull();
  });

  it('the top bar + opens New category and creates it', async () => {
    http.POST.mockResolvedValue({ data: { id: 'c3', name: 'Pets' } });
    renderWithQuery(<CategoriesScreen categories={pageOf(categories)} state={state} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Add/ })[0]);
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: ' Pets ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(http.POST).toHaveBeenCalledWith('/api/v1/categories', { body: { name: 'Pets' } }));
    await waitFor(() => expect(toasts.showToast).toHaveBeenCalledWith('Category "Pets" created'));
  });

  it('pages with the Pager above and below, keeping the search in the address', () => {
    renderWithQuery(
      <CategoriesScreen categories={{ rows: categories, totalElements: 45, totalPages: 3 }} state={{ q: 'din', page: 0 }} />,
    );
    expect(screen.getAllByText(/45/)).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: "Page 2" })[0]);
    expect(router.push).toHaveBeenCalledWith('?q=din&page=1', { scroll: false });
  });

  it('shows the Uncategorized card only when given its data', () => {
    const { unmount } = renderWithQuery(<CategoriesScreen categories={pageOf(categories)} state={state} />);
    expect(screen.queryByText(/Uncategorized/)).toBeNull();
    unmount();
    renderWithQuery(
      <CategoriesScreen
        categories={pageOf(categories)}
        state={state}
        uncategorized={{ count: 2, transactions: [], rows: [{ id: 't', description: 'Croma', detail: '9 Sep · ₹24,990' }], reviewHref: '/ds/transactions' }}
      />,
    );
    expect(screen.getByText('Uncategorized · 2')).toBeTruthy();
  });
});
