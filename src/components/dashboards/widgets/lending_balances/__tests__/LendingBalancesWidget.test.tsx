import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/reports/underlying/RowBreakdownDialog', () => ({
  RowBreakdownDialog: (p: { datasource: string; rowId: string; title: string }) => (
    <div data-testid="breakdown-dialog" data-datasource={p.datasource} data-row={p.rowId} data-title={p.title} />
  ),
}));
const launcher = vi.hoisted(() => ({
  launch: vi.fn(),
  prefetch: vi.fn(),
  pendingId: null as string | null,
}));
vi.mock('@/components/shortcuts/actions', () => ({
  useActionLauncher: () => ({ ...launcher, dialog: <div data-testid="launcher-dialog" /> }),
}));

import { api } from '@/lib/api/client';
import type { CounterpartyResponse } from '@/lib/lending.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { LENDING_BALANCES_TOP, LendingBalancesWidget } from '../LendingBalancesWidget';

const person = (id: string, name: string, netPosition: number): CounterpartyResponse => ({
  id, name, netPosition, entryCount: 2, totalLent: 0, totalBorrowed: 0, repaidByYou: 0, repaidToYou: 0,
});

const respond = (content: CounterpartyResponse[], totalElements = content.length) =>
  vi.mocked(api.GET).mockResolvedValue({ data: { content, totalElements, number: 0, size: LENDING_BALANCES_TOP } } as never);

describe('LendingBalancesWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    launcher.pendingId = null;
    launcher.launch.mockResolvedValue(undefined);
  });

  it('asks the server for the top people with a balance, biggest |net| first', async () => {
    respond([]);
    renderWithQuery(<LendingBalancesWidget />);
    await screen.findByText('All square');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/counterparties', {
      params: { query: { page: 0, size: LENDING_BALANCES_TOP, outstanding: true, sort: ['net'] } },
    });
  });

  it('loading and error states', async () => {
    vi.mocked(api.GET).mockReturnValueOnce(new Promise(() => {}) as never);
    const { unmount } = renderWithQuery(<LendingBalancesWidget />);
    expect(screen.getByTestId('lending-balances-loading')).toBeInTheDocument();
    unmount();
    vi.mocked(api.GET).mockRejectedValue(new Error('x'));
    renderWithQuery(<LendingBalancesWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load lending balances");
  });

  it('nobody owing → All square with a link to lendings', async () => {
    respond([]);
    renderWithQuery(<LendingBalancesWidget />);
    expect(await screen.findByText('All square')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to lendings' })).toHaveAttribute('href', '/loans/lendings');
  });

  it('rows read who owes whom with the amount; View all only when more people have balances', async () => {
    respond([person('p1', 'Rahul', 12000), person('p2', 'Priya', -2500)], 9);
    renderWithQuery(<LendingBalancesWidget />);
    const rows = within(await screen.findByRole('list', { name: 'Balances' })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Rahul');
    expect(rows[0]).toHaveTextContent('Owes you');
    expect(rows[0]).toHaveTextContent('₹12,000');
    expect(rows[1]).toHaveTextContent('You owe');
    expect(rows[1]).toHaveTextContent('₹2,500');
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/loans/lendings');
  });

  it('no View all when every person is shown', async () => {
    respond([person('p1', 'Rahul', 12000)], 1);
    renderWithQuery(<LendingBalancesWidget />);
    await screen.findByText('Rahul');
    expect(screen.queryByRole('link', { name: 'View all' })).not.toBeInTheDocument();
  });

  it('Settle up launches Record lending preset to clear the balance (both directions)', async () => {
    const rahul = person('p1', 'Rahul', 12000);
    const priya = person('p2', 'Priya', -2500);
    respond([rahul, priya]);
    renderWithQuery(<LendingBalancesWidget />);
    await userEvent.click(await screen.findByRole('button', { name: 'Settle up with Rahul' }));
    expect(launcher.launch).toHaveBeenLastCalledWith('record-lending', {
      counterparty: rahul, entryType: 'repaid_to_me', amount: 12000,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Settle up with Priya' }));
    expect(launcher.launch).toHaveBeenLastCalledWith('record-lending', {
      counterparty: priya, entryType: 'repaid_by_me', amount: 2500,
    });
    // The launched dialog is rendered by the widget.
    expect(screen.getByTestId('launcher-dialog')).toBeInTheDocument();
  });

  it('Settle up prefetches the dialog on hover, focus and touch', async () => {
    respond([person('p1', 'Rahul', 12000)]);
    renderWithQuery(<LendingBalancesWidget />);
    const button = await screen.findByRole('button', { name: 'Settle up with Rahul' });
    fireEvent.pointerEnter(button);
    fireEvent.focus(button);
    fireEvent.touchStart(button);
    expect(launcher.prefetch).toHaveBeenCalledTimes(3);
    expect(launcher.prefetch).toHaveBeenCalledWith('record-lending');
    expect(launcher.launch).not.toHaveBeenCalled();
  });

  it('only the launching row spins (disabled) while the dialog loads', async () => {
    respond([person('p1', 'Rahul', 12000), person('p2', 'Priya', -2500)]);
    let finish: () => void = () => {};
    launcher.launch.mockImplementation(() => new Promise<void>((r) => { finish = r; }));
    const { rerender } = renderWithQuery(<LendingBalancesWidget />);
    await userEvent.click(await screen.findByRole('button', { name: 'Settle up with Rahul' }));
    launcher.pendingId = 'record-lending';
    rerender(<LendingBalancesWidget />);
    expect(screen.getByRole('button', { name: 'Settle up with Rahul' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Settle up with Priya' })).toBeEnabled();
    launcher.pendingId = null;
    finish();
    rerender(<LendingBalancesWidget />);
    expect(await screen.findByRole('button', { name: 'Settle up with Rahul' })).toBeEnabled();
  });

  it('the amount opens that person\'s net-worth breakdown', async () => {
    respond([person('p1', 'Rahul', 12000)]);
    renderWithQuery(<LendingBalancesWidget />);
    await userEvent.click(await screen.findByRole('button', { name: /— view breakdown of Rahul$/ }));
    const dialog = await screen.findByTestId('breakdown-dialog');
    expect(dialog).toHaveAttribute('data-datasource', 'net_worth');
    expect(dialog).toHaveAttribute('data-row', 'p1');
    expect(dialog).toHaveAttribute('data-title', 'Rahul');
  });
});
