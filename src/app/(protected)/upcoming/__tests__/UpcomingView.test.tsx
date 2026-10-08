import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let search = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => search,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/upcoming',
}));
vi.mock('next/link', () => ({ default: ({ href, children, ...r }: any) => <a href={href} {...r}>{children}</a> }));
vi.mock('@/components/layout/PageActionBarContext', () => ({ PageActionBar: () => null }));
vi.mock('@/components/upcoming/MarkPaidHost', () => ({
  MarkPaidHost: ({ statementId, onClose }: any) => (
    <div data-testid="host">{statementId ?? 'none'}<button onClick={onClose}>close-host</button></div>
  ),
}));
vi.mock('@/lib/date-range', async () => {
  const actual = await vi.importActual<typeof import('@/lib/date-range')>('@/lib/date-range');
  return { ...actual, todayInAppZone: () => '2026-10-08' };
});
vi.mock('@/lib/query/hooks/useObligations', () => ({ useObligations: vi.fn() }));

import { useObligations } from '@/lib/query/hooks/useObligations';
import { renderWithQuery } from '@/test/renderWithQuery';

import { UpcomingView } from '../UpcomingView';

const row = (o: any) => ({ type: 'emi', status: 'upcoming', date: '2026-10-10', amount: 100, title: 'row', ...o });
const ITEMS = [
  row({ title: 'Overdue EMI', status: 'overdue', date: '2026-10-01', amount: 900 }),
  row({ title: 'Bill A', type: 'card_bill', statementId: 'S1', date: '2026-10-12' }),
  row({ title: 'Lend B', type: 'lending_due', date: '2026-10-25' }),
  row({ title: 'Stmt C', type: 'statement_expected', date: null, amount: null }),
];

beforeEach(() => {
  vi.resetAllMocks();
  search = new URLSearchParams();
  vi.mocked(useObligations).mockReturnValue({ data: ITEMS, error: null, isFetched: true } as never);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("CSS", { escape: (s: string) => s });
});

describe('UpcomingView', () => {
  it('fetches with the default 3-month horizon and no kind argument', () => {
    renderWithQuery(<UpcomingView />);
    expect(useObligations).toHaveBeenCalledWith(3);
  });

  it('lists grouped sections in List view with undated last', () => {
    renderWithQuery(<UpcomingView />);
    const text = document.body.textContent!;
    expect(text.indexOf('Overdue (1)')).toBeLessThan(text.indexOf('Next 7 days (1)'));
    expect(text.indexOf('Next 7 days (1)')).toBeLessThan(text.indexOf('Later this month (1)'));
    expect(text.indexOf('Later this month (1)')).toBeLessThan(text.indexOf('No due date yet (1)'));
  });

  it('kind chips filter client-side without changing the query arguments', async () => {
    renderWithQuery(<UpcomingView />);
    await userEvent.click(screen.getAllByRole('button', { name: 'EMIs' })[0]);
    expect(screen.getByText('Overdue EMI')).toBeInTheDocument();
    expect(screen.queryByText('Bill A')).toBeNull();
    expect(vi.mocked(useObligations).mock.calls.every((c) => c.length === 1 && c[0] === 3)).toBe(true);
    await userEvent.click(screen.getAllByRole('button', { name: 'All' })[0]);
    expect(screen.getByText('Bill A')).toBeInTheDocument();
  });

  it('the filter also drives the totals strip', async () => {
    renderWithQuery(<UpcomingView />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Lending' })[0]);
    expect(screen.queryByText('Overdue EMI')).toBeNull();
    expect(screen.getByText('Lend B')).toBeInTheDocument();
  });

  it('switches to the calendar view and back', async () => {
    renderWithQuery(<UpcomingView />);
    await userEvent.click(screen.getByRole('tab', { name: 'Calendar' }));
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'List' }));
    expect(screen.queryByRole('button', { name: 'Next month' })).toBeNull();
    expect(screen.getByText(/Overdue \(1\)/)).toBeInTheDocument();
  });

  it('shows an error banner when loading fails', () => {
    vi.mocked(useObligations).mockReturnValue({ data: undefined, error: new Error('x'), isFetched: true } as never);
    renderWithQuery(<UpcomingView />);
    expect(screen.getByText(/Failed to load upcoming items/)).toBeInTheDocument();
  });

  it('shows the empty state when nothing is scheduled', () => {
    vi.mocked(useObligations).mockReturnValue({ data: [], error: null, isFetched: true } as never);
    renderWithQuery(<UpcomingView />);
    expect(screen.getByText(/Nothing scheduled within the next 3 months/)).toBeInTheDocument();
  });

  it('?bill= highlights the matching row and scrolls it into view', () => {
    search = new URLSearchParams('bill=S1');
    const { container } = renderWithQuery(<UpcomingView />);
    expect(container.querySelector('[data-bill-row="S1"]')!.className).toContain('ring-emerald-300');
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('does not scroll before data has been fetched or without ?bill=', () => {
    renderWithQuery(<UpcomingView />);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    search = new URLSearchParams('bill=S1');
    vi.mocked(useObligations).mockReturnValue({ data: ITEMS, error: null, isFetched: false } as never);
    renderWithQuery(<UpcomingView />);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('Mark paid on a card bill opens the host with its statement id; closing clears it', async () => {
    renderWithQuery(<UpcomingView />);
    expect(screen.getByTestId('host')).toHaveTextContent('none');
    await userEvent.click(screen.getByRole('button', { name: 'Mark paid' }));
    expect(screen.getByTestId('host')).toHaveTextContent('S1');
    await userEvent.click(within(screen.getByTestId('host')).getByText('close-host'));
    expect(screen.getByTestId('host')).toHaveTextContent('none');
  });
});
