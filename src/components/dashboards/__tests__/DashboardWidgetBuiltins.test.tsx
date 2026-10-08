import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/bills/BillsDueWidget', () => ({
  BillsDueWidget: ({ accountId }: { accountId?: string | null }) => (
    <div data-testid="bills-widget" data-account={accountId ?? 'none'} />
  ),
}));
vi.mock('@/components/inbox/InboxWidget', () => ({ InboxWidget: () => <div data-testid="inbox-widget" /> }));
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DashboardWidgetView } from '@/components/dashboards/DashboardWidgetView';
import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { api } from '@/lib/api/client';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { KpiData, TableData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

const L = { x: 0, y: 0, w: 100, h: 24 };
const table: TableData = {
  type: 'TABLE', mode: 'raw',
  columns: [{ key: 'title', label: 'Title', type: 'string' }],
  rows: [{ id: 1, title: 'Card bill' }],
  page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
};
const kpi: KpiData = {
  type: 'KPI', value: 5000, measure: 'amount', aggregation: 'sum', format: 'number', comparison: null,
  meta: { rowCount: 1, dateRange: null as never },
};

const template = (over: Partial<WidgetResponse> = {}): WidgetResponse => ({
  id: 'w-up', kind: 'builtin', reportId: null, builtinKey: 'upcoming',
  params: { days: 14, junk: null }, title: null, layout: L,
  builtin: { key: 'upcoming', label: 'Upcoming', minW: 100, kind: 'template', templateType: 'TABLE', href: '/upcoming' },
  ...over,
});
const component = (key: string, params: Record<string, unknown> = {}, over: Partial<WidgetResponse> = {}): WidgetResponse => ({
  id: `w-${key}`, kind: 'builtin', reportId: null, builtinKey: key, params, title: null, layout: L,
  builtin: { key, label: key === 'attention' ? 'Inbox' : 'Bills due', minW: 100, kind: 'component', templateType: null, href: key === 'attention' ? '/inbox' : null },
  ...over,
});

describe('DashboardWidgetView built-ins', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.POST).mockResolvedValue({ data: table } as never);
  });

  it('a TABLE template posts only declared params and page/size', async () => {
    renderWithQuery(<DashboardWidgetView widget={template()} />);
    expect(await screen.findByText('Card bill')).toBeInTheDocument();
    expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/builtins/{key}/data', {
      params: { path: { key: 'upcoming' }, query: { page: 0, size: DEFAULT_TABLE_PAGE_SIZE } },
      body: { params: { days: 14 } },
    });
  });

  it('a KPI template sends no paging query', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: kpi } as never);
    const w = template({
      id: 'w-nw', builtinKey: 'net_worth', params: {},
      builtin: { key: 'net_worth', label: 'Net worth', minW: 50, kind: 'template', templateType: 'KPI', href: '/accounts' },
    });
    renderWithQuery(<DashboardWidgetView widget={w} />);
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/dashboards/builtins/{key}/data', {
      params: { path: { key: 'net_worth' }, query: {} },
      body: { params: {} },
    });
  });

  it('shows a skeleton while loading and an error message on failure', async () => {
    vi.mocked(api.POST).mockReturnValue(new Promise(() => {}) as never);
    const { unmount } = renderWithQuery(<DashboardWidgetView widget={template()} />);
    expect(await screen.findByTestId('widget-skeleton')).toBeInTheDocument();
    unmount();
    vi.mocked(api.POST).mockRejectedValue(new Error('boom'));
    renderWithQuery(<DashboardWidgetView widget={template()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load widget');
  });

  it('bills_due renders its component with the accountId param and never fetches', async () => {
    renderWithQuery(<DashboardWidgetView widget={component('bills_due', { accountId: 'acc-1' })} />);
    expect(screen.getByTestId('bills-widget')).toHaveAttribute('data-account', 'acc-1');
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('bills_due without an accountId means all cards', () => {
    renderWithQuery(<DashboardWidgetView widget={component('bills_due')} />);
    expect(screen.getByTestId('bills-widget')).toHaveAttribute('data-account', 'none');
  });

  it('attention renders the Inbox widget', () => {
    renderWithQuery(<DashboardWidgetView widget={component('attention')} />);
    expect(screen.getByTestId('inbox-widget')).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('an unknown component built-in shows the placeholder', () => {
    renderWithQuery(<DashboardWidgetView widget={component('mystery')} />);
    expect(screen.getByText('This widget is no longer available.')).toBeInTheDocument();
  });

  it('a built-in the server dropped shows the placeholder, no menu, and never fetches', () => {
    renderWithQuery(<DashboardWidgetView widget={template({ builtin: undefined })} />);
    expect(screen.getByText('This widget is no longer available.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more actions/i })).not.toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('a report widget still uses the report data endpoint', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: kpi } as never);
    const w: WidgetResponse = {
      id: 'r1', kind: 'report', reportId: 'rep-1', title: null, layout: L,
      report: { name: 'Spend', type: 'KPI', available: true },
    };
    renderWithQuery(<DashboardWidgetView widget={w} />);
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/reports/{id}/data', { params: { path: { id: 'rep-1' }, query: {} } }));
  });

  describe('chrome', () => {
    it('shows Open for a built-in with an href, pointing at it', () => {
      renderWithQuery(<DashboardWidgetView widget={template()} />);
      expect(screen.getByRole('link', { name: 'Open Upcoming' })).toHaveAttribute('href', '/upcoming');
    });

    it('shows no Open for a built-in without an href', () => {
      renderWithQuery(<DashboardWidgetView widget={component('bills_due')} />);
      expect(screen.queryByRole('link', { name: /^open/i })).not.toBeInTheDocument();
    });

    it('shows no Open for a built-in whose href is set but the widget is unavailable', () => {
      renderWithQuery(<DashboardWidgetView widget={template({ builtin: undefined })} />);
      expect(screen.queryByRole('link', { name: /^open/i })).not.toBeInTheDocument();
    });

    it('subtitles: Next N days, singular day, All accounts, Most urgent first, All cards', () => {
      const { unmount } = renderWithQuery(<DashboardWidgetView widget={template()} />);
      expect(screen.getByText('Next 14 days')).toBeInTheDocument();
      unmount();
      const one = renderWithQuery(<DashboardWidgetView widget={template({ params: { days: 1 } })} />);
      expect(screen.getByText('Next 1 day')).toBeInTheDocument();
      one.unmount();
      const att = renderWithQuery(<DashboardWidgetView widget={component('attention')} />);
      expect(screen.getByText('Most urgent first')).toBeInTheDocument();
      att.unmount();
      const bills = renderWithQuery(<DashboardWidgetView widget={component('bills_due')} />);
      expect(screen.getByText('All cards')).toBeInTheDocument();
      bills.unmount();
      renderWithQuery(
        <DashboardWidgetView
          widget={template({ id: 'nw', builtinKey: 'net_worth', params: {}, builtin: { key: 'net_worth', label: 'Net worth', minW: 50, kind: 'template', templateType: 'KPI', href: '/accounts' } })}
        />,
      );
      expect(screen.getByText('All accounts')).toBeInTheDocument();
    });

    it('upcoming without a days param has no subtitle', () => {
      renderWithQuery(<DashboardWidgetView widget={template({ params: {} })} />);
      expect(screen.queryByText(/^Next \d/)).not.toBeInTheDocument();
    });

    it('bills_due scoped to a card shows that card name, falling back to One card', async () => {
      vi.mocked(api.GET).mockResolvedValue({ data: [{ id: 'acc-1', name: 'HDFC Card', type: 'credit_card' }] } as never);
      const { unmount } = renderWithQuery(<DashboardWidgetView widget={component('bills_due', { accountId: 'acc-1' })} />);
      expect(await screen.findByText('HDFC Card')).toBeInTheDocument();
      unmount();
      renderWithQuery(<DashboardWidgetView widget={component('bills_due', { accountId: 'ghost' })} />);
      expect(await screen.findByText('One card')).toBeInTheDocument();
    });

    it('a report widget never shows Open or a subtitle', () => {
      const w: WidgetResponse = {
        id: 'r1', kind: 'report', reportId: 'rep-1', title: null, layout: L,
        report: { name: 'Spend', type: 'TABLE', available: true },
      };
      renderWithQuery(<DashboardWidgetView widget={w} />);
      expect(screen.queryByRole('link', { name: /^open/i })).not.toBeInTheDocument();
    });
  });

  describe('overflow menu', () => {
    it('report widget: Edit report and View full page, no Duplicate', async () => {
      const user = userEvent.setup();
      const w: WidgetResponse = {
        id: 'r1', kind: 'report', reportId: 'rep-1', title: null, layout: L,
        report: { name: 'Spend', type: 'KPI', available: true },
      };
      vi.mocked(api.POST).mockResolvedValue({ data: kpi } as never);
      renderWithQuery(<DashboardWidgetView widget={w} />);
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      expect(await screen.findByRole('menuitem', { name: /edit report/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /view full page/i })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /duplicate as my report/i })).not.toBeInTheDocument();
    });

    it('template built-in: Duplicate and View full page, no Edit report', async () => {
      const user = userEvent.setup();
      renderWithQuery(<DashboardWidgetView widget={template()} />);
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      expect(await screen.findByRole('menuitem', { name: /duplicate as my report/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /view full page/i })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /edit report/i })).not.toBeInTheDocument();
    });

    it('component built-in: only View full page', async () => {
      const user = userEvent.setup();
      renderWithQuery(<DashboardWidgetView widget={component('attention')} />);
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      expect(await screen.findByRole('menuitem', { name: /view full page/i })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /duplicate/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /edit report/i })).not.toBeInTheDocument();
    });

    it('View full page opens a dialog with the widget title and body', async () => {
      const user = userEvent.setup();
      renderWithQuery(<DashboardWidgetView widget={component('attention')} />);
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      await user.click(await screen.findByRole('menuitem', { name: /view full page/i }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getAllByTestId('inbox-widget').length).toBe(2);
    });

    it('full page for a built-in has no Edit report link', async () => {
      const user = userEvent.setup();
      renderWithQuery(<DashboardWidgetView widget={template()} />);
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      await user.click(await screen.findByRole('menuitem', { name: /view full page/i }));
      await screen.findByRole('dialog');
      expect(screen.queryByRole('link', { name: /edit report/i })).not.toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('built-in shows no Edit report link and a disabled width toggle at full-width minimum', () => {
      renderWithQuery(<DashboardWidgetView widget={template()} editing />);
      expect(screen.queryByRole('link', { name: /edit report/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'This widget needs the full width' })).toBeDisabled();
      expect(screen.getByRole('textbox', { name: 'Widget title' })).toHaveAttribute('placeholder', 'Upcoming');
    });

    it('a half-width-capable built-in can be toggled and removed; title edits report null when cleared', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      const onRemove = vi.fn();
      const onTitle = vi.fn();
      const w = template({
        id: 'nw', builtinKey: 'net_worth', params: {}, layout: { ...L, w: 50 },
        builtin: { key: 'net_worth', label: 'Net worth', minW: 50, kind: 'template', templateType: 'KPI', href: '/accounts' },
      });
      vi.mocked(api.POST).mockResolvedValue({ data: kpi } as never);
      renderWithQuery(<DashboardWidgetView widget={w} editing onToggleWidth={onToggle} onRemove={onRemove} onTitleChange={onTitle} />);
      await user.click(screen.getByRole('button', { name: 'Expand to full width' }));
      await user.click(screen.getByRole('button', { name: 'Remove widget' }));
      await user.type(screen.getByRole('textbox', { name: 'Widget title' }), 'A');
      expect(onToggle).toHaveBeenCalled();
      expect(onRemove).toHaveBeenCalled();
      expect(onTitle).toHaveBeenCalledWith('A');
    });

    it('a full-width toggleable widget offers collapse', () => {
      const w = template({
        id: 'nw', builtinKey: 'net_worth', params: {}, layout: { ...L, w: 100 },
        builtin: { key: 'net_worth', label: 'Net worth', minW: 50, kind: 'template', templateType: 'KPI', href: null },
      });
      vi.mocked(api.POST).mockResolvedValue({ data: kpi } as never);
      renderWithQuery(<DashboardWidgetView widget={w} editing />);
      expect(screen.getByRole('button', { name: 'Collapse to half width' })).toBeEnabled();
    });
  });
});
