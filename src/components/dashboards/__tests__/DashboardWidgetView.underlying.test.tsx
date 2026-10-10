import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/inbox/InboxWidget', () => ({ InboxWidget: () => <div data-testid="inbox-widget" /> }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
// The dialog has its own tests; here only whether it is mounted and with what.
vi.mock('@/components/reports/underlying/KpiUnderlyingDialog', () => ({
  KpiUnderlyingDialog: (props: {
    source: unknown;
    kpi: { value: number | null };
    title: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div
      data-testid="vud"
      data-source={JSON.stringify(props.source)}
      data-title={props.title}
      data-value={String(props.kpi.value)}
      data-open={String(props.open)}
    >
      <button type="button" onClick={() => props.onOpenChange(false)}>
        Close underlying
      </button>
    </div>
  ),
}));

import { DashboardWidgetView } from '@/components/dashboards/DashboardWidgetView';
import { api } from '@/lib/api/client';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { KpiData, TableData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

const L = { x: 0, y: 0, w: 50, h: 24 };
const kpi: KpiData = {
  type: 'KPI', value: 5000, measure: 'amount', aggregation: 'sum', format: 'number', comparison: null,
  meta: { rowCount: 1, dateRange: null as never },
};
const table: TableData = {
  type: 'TABLE', mode: 'raw',
  columns: [{ key: 'title', label: 'Title', type: 'string' }],
  rows: [{ id: 'r1', title: 'Card bill' }],
  page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
};

const savedKpi: WidgetResponse = {
  id: 'w-saved', kind: 'report', reportId: 'rep-1', title: 'Monthly spend', layout: L,
  report: { name: 'Spend report', type: 'KPI', available: true },
};
const netWorth: WidgetResponse = {
  id: 'w-nw', kind: 'builtin', reportId: null, builtinKey: 'net_worth', params: { scope: 'all', junk: null },
  title: null, layout: L,
  builtin: { category: 'overview', key: 'net_worth', label: 'Net worth', minW: 50, kind: 'template', templateType: 'KPI', href: '/accounts' },
};
const tableWidget: WidgetResponse = {
  id: 'w-table', kind: 'report', reportId: 'rep-2', title: 'Bills', layout: L,
  report: { name: 'Bills', type: 'TABLE', available: true },
};
const attention: WidgetResponse = {
  id: 'w-att', kind: 'builtin', reportId: null, builtinKey: 'attention', params: {}, title: null, layout: L,
  builtin: { category: 'overview', key: 'attention', label: 'Inbox', minW: 50, kind: 'component', templateType: null, href: '/inbox' },
};

const valueButton = () => screen.findByRole('button', { name: 'View underlying data' });
const vud = () => screen.getByTestId('vud');
const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /more actions/i }));
  await screen.findByRole('menuitem', { name: /view full page/i });
};

describe('DashboardWidgetView "View underlying data"', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: kpi } as never);
  });

  it('does not mount the dialog until it is asked for', async () => {
    renderWithQuery(<DashboardWidgetView widget={savedKpi} />);
    await valueButton();
    expect(screen.queryByTestId('vud')).not.toBeInTheDocument();
  });

  it('saved-report KPI: tapping the value opens it for the report, titled like the widget', async () => {
    const user = userEvent.setup();
    renderWithQuery(<DashboardWidgetView widget={savedKpi} />);
    await user.click(await valueButton());

    expect(JSON.parse(vud().dataset.source!)).toEqual({ kind: 'saved', reportId: 'rep-1' });
    expect(vud()).toHaveAttribute('data-title', 'Monthly spend');
    expect(vud()).toHaveAttribute('data-value', '5000');
    expect(vud()).toHaveAttribute('data-open', 'true');
  });

  it('KPI template built-in (net worth): opens it for the built-in key with the widget params', async () => {
    const user = userEvent.setup();
    renderWithQuery(<DashboardWidgetView widget={netWorth} />);
    await user.click(await valueButton());

    expect(JSON.parse(vud().dataset.source!)).toEqual({ kind: 'builtin', key: 'net_worth', params: { scope: 'all' } });
    expect(vud()).toHaveAttribute('data-title', 'Net worth');
  });

  it('closing the dialog unmounts it', async () => {
    const user = userEvent.setup();
    renderWithQuery(<DashboardWidgetView widget={savedKpi} />);
    await user.click(await valueButton());
    await user.click(screen.getByRole('button', { name: 'Close underlying' }));
    expect(screen.queryByTestId('vud')).not.toBeInTheDocument();
  });

  it('the overflow menu offers it after "View full page" for a KPI widget, and it opens the dialog', async () => {
    const user = userEvent.setup();
    renderWithQuery(<DashboardWidgetView widget={netWorth} />);
    await valueButton();
    await openMenu(user);

    const items = screen.getAllByRole('menuitem').map((item) => item.textContent);
    expect(items.indexOf('View underlying data')).toBe(items.indexOf('View full page') + 1);
    await user.click(screen.getByRole('menuitem', { name: 'View underlying data' }));
    expect(JSON.parse(vud().dataset.source!)).toEqual({ kind: 'builtin', key: 'net_worth', params: { scope: 'all' } });
  });

  it('the menu has no item while the KPI value is still loading', async () => {
    const user = userEvent.setup();
    vi.mocked(api.POST).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<DashboardWidgetView widget={savedKpi} />);
    await openMenu(user);
    expect(screen.queryByRole('menuitem', { name: 'View underlying data' })).not.toBeInTheDocument();
  });

  it('the menu has no item when the KPI failed to load', async () => {
    const user = userEvent.setup();
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    renderWithQuery(<DashboardWidgetView widget={savedKpi} />);
    await screen.findByRole('alert');
    await openMenu(user);
    expect(screen.queryByRole('menuitem', { name: 'View underlying data' })).not.toBeInTheDocument();
  });

  it('a table widget gets neither the menu item nor a value button', async () => {
    const user = userEvent.setup();
    vi.mocked(api.POST).mockResolvedValue({ data: table } as never);
    renderWithQuery(<DashboardWidgetView widget={tableWidget} />);
    await screen.findByText('Card bill');
    await openMenu(user);
    expect(screen.queryByRole('menuitem', { name: 'View underlying data' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View underlying data' })).not.toBeInTheDocument();
  });

  it('a component built-in gets no menu item', async () => {
    const user = userEvent.setup();
    renderWithQuery(<DashboardWidgetView widget={attention} />);
    await openMenu(user);
    expect(screen.queryByRole('menuitem', { name: 'View underlying data' })).not.toBeInTheDocument();
  });

  it('works from the full-page view too', async () => {
    const user = userEvent.setup();
    renderWithQuery(<DashboardWidgetView widget={savedKpi} />);
    await valueButton();
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /view full page/i }));

    const fullPage = await screen.findByRole('dialog');
    await user.click(within(fullPage).getByRole('button', { name: 'View underlying data' }));
    expect(JSON.parse(vud().dataset.source!)).toEqual({ kind: 'saved', reportId: 'rep-1' });
  });

  it('edit mode leaves the value plain (the card is being arranged)', async () => {
    renderWithQuery(<DashboardWidgetView widget={savedKpi} editing />);
    await waitFor(() => expect(screen.getByText('5,000')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'View underlying data' })).not.toBeInTheDocument();
  });
});
