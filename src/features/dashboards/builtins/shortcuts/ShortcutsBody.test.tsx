import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  items: [] as Array<{ id: string; kind: string; label: string; href: string | null; actionId: string | null }>,
  pending: false,
  addTransaction: vi.fn(),
  addLending: vi.fn(),
}));
vi.mock('./shortcutsCatalog', () => ({ useShortcuts: () => ({ items: state.items, pending: state.pending }) }));
vi.mock('@/features/transactions/form/AddTransactionProvider', () => ({ useAddTransaction: () => ({ open: state.addTransaction }) }));
vi.mock('@/features/lendings/form/AddLendingProvider', () => ({ useAddLending: () => ({ open: state.addLending }) }));

import { ShortcutsBody } from './ShortcutsBody';

const page = (id: string, label: string, href: string) => ({ id, kind: 'page', label, href, actionId: null });

describe('ShortcutsBody', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.items = [];
    state.pending = false;
  });

  it('pages are links in the stored order', () => {
    state.items = [page('page:/upcoming', 'Upcoming', '/upcoming'), page('page:/transactions/import', 'Import', '/transactions/import')];
    render(<ShortcutsBody ids={['x']} />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Upcoming', 'Import']);
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/upcoming'));
  });

  it('a page built in Dinero opens its /ds page; one that is not keeps its current route', () => {
    state.items = [page('page:/upcoming', 'Upcoming', '/upcoming'), page('page:/transactions/review', 'Needs Review', '/transactions/review')];
    render(<ShortcutsBody ids={['x']} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/ds/upcoming');
    expect(links[1]).toHaveAttribute('href', '/transactions/review');
  });

  it('dialog actions are buttons that open their dialog from state', async () => {
    state.items = [
      { id: 'action:add-transaction', kind: 'action', label: 'Add transaction', href: null, actionId: 'add-transaction' },
      { id: 'action:record-lending', kind: 'action', label: 'Record lending', href: null, actionId: 'record-lending' },
    ];
    render(<ShortcutsBody ids={['x']} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(state.addTransaction).toHaveBeenCalledTimes(1);
    expect(state.addLending).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Record lending' }));
    expect(state.addLending).toHaveBeenCalledTimes(1);
  });

  it('shows the skeleton while a list the ids need is still loading', () => {
    state.pending = true;
    render(<ShortcutsBody ids={['account:a']} />);
    expect(screen.getByTestId('shortcuts-loading')).toBeInTheDocument();
  });

  it('nothing resolves: a hint to pick some in settings', () => {
    render(<ShortcutsBody ids={['page:/gone']} />);
    expect(screen.getByText('No shortcuts')).toBeInTheDocument();
    expect(screen.getByText("Pick some in this widget's settings.")).toBeInTheDocument();
  });
});
