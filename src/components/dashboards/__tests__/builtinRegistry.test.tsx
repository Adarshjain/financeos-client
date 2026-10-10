import { render, screen } from '@testing-library/react';
import { CalendarClock, CreditCard, Inbox, Wallet } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/bills/BillsDueWidget', () => ({
  BillsDueWidget: ({ accountId, className }: { accountId?: string | null; className?: string }) => (
    <div data-testid="bills-widget" data-account={accountId ?? 'none'} className={className} />
  ),
}));
vi.mock('@/components/inbox/InboxWidget', () => ({
  InboxWidget: ({ className }: { className?: string }) => <div data-testid="inbox-widget" className={className} />,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import {
  BUILTIN_REGISTRY,
  builtinEntry,
  builtinEntryOf,
  builtinKeyOf,
  builtinParamsEditor,
  type BuiltinParamsEditorProps,
  builtinViewName,
  serverSubtitle,
  TEMPLATE_VIEWS,
  templateView,
  templateViewOf,
  type TemplateViewProps,
} from '@/components/dashboards/builtins/registry';
import { DashboardWidgetView } from '@/components/dashboards/DashboardWidgetView';
import { phoneSlot, WidgetSubtitle } from '@/components/dashboards/widgetMeta';
import { api } from '@/lib/api/client';
import type { WidgetResponse } from '@/lib/dashboards.types';
import type { TableData } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

const L = { x: 0, y: 0, w: 100, h: 24 };
const builtin = (
  key: string,
  kind: 'component' | 'template',
  templateType: string | null,
  ref: Record<string, unknown> = {},
  over: Partial<WidgetResponse> = {},
): WidgetResponse => ({
  id: `w-${key}`, kind: 'builtin', reportId: null, builtinKey: key, params: {}, title: null, layout: L,
  builtin: { key, label: key, minW: 50, kind, templateType, ...ref } as WidgetResponse['builtin'],
  ...over,
});
const report = (): WidgetResponse => ({
  id: 'r', kind: 'report', reportId: 'r', title: null, layout: L, builtinKey: 'attention',
  report: { name: 'R', type: 'TABLE', available: true },
});

const table: TableData = {
  type: 'TABLE', mode: 'raw',
  columns: [{ key: 'title', label: 'Title', type: 'string' }],
  rows: [{ id: 1, title: 'Plain table row' }],
  page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
};

// Tests register entries/views on the shared (read-only typed) maps; each is removed afterwards.
const views = TEMPLATE_VIEWS as Record<string, unknown>;
const registry = BUILTIN_REGISTRY as Record<string, unknown>;

describe('builtin registry lookups', () => {
  it('has the four existing built-ins with their icons; component ones carry a body and a content-sized phone slot', () => {
    expect(builtinEntry('net_worth')?.icon).toBe(Wallet);
    expect(builtinEntry('attention')?.icon).toBe(Inbox);
    expect(builtinEntry('upcoming')?.icon).toBe(CalendarClock);
    expect(builtinEntry('bills_due')?.icon).toBe(CreditCard);
    expect(builtinEntry('attention')?.Body).toBeDefined();
    expect(builtinEntry('bills_due')?.Body).toBeDefined();
    expect(builtinEntry('attention')?.phone).toEqual({ fit: 'content' });
    expect(builtinEntry('bills_due')?.phone).toEqual({ fit: 'content' });
    // Templates render by templateType: no body, phone slot by shape.
    expect(builtinEntry('net_worth')?.Body).toBeUndefined();
    expect(builtinEntry('upcoming')?.phone).toBeUndefined();
  });

  it('returns null for an unknown, empty or prototype key', () => {
    expect(builtinEntry('nope')).toBeNull();
    expect(builtinEntry(null)).toBeNull();
    expect(builtinEntry(undefined)).toBeNull();
    expect(builtinEntry('')).toBeNull();
    expect(builtinEntry('toString')).toBeNull();
    expect(builtinEntry('__proto__')).toBeNull();
  });

  it('reads a widget key from builtinKey, else the ref; report widgets have no entry', () => {
    expect(builtinKeyOf({ builtinKey: null, builtin: { category: 'overview', key: 'upcoming', label: '', minW: 1, kind: 'template' } })).toBe('upcoming');
    expect(builtinKeyOf({ builtinKey: null, builtin: undefined })).toBeNull();
    expect(builtinEntryOf(builtin('upcoming', 'template', 'TABLE', {}, { builtinKey: null }))?.icon).toBe(CalendarClock);
    expect(builtinEntryOf(report())).toBeNull();
  });

  it('has no params editor yet; a registered one is found by key', () => {
    expect(builtinParamsEditor('bills_due')).toBeNull();
    expect(builtinParamsEditor('nope')).toBeNull();
    const Editor = (_: BuiltinParamsEditorProps) => null;
    registry.test_editor = { icon: Wallet, ParamsEditor: Editor };
    try {
      expect(builtinParamsEditor('test_editor')).toBe(Editor);
    } finally {
      delete registry.test_editor;
    }
  });
});

describe('template views', () => {
  afterEach(() => {
    delete views.test_view;
  });

  it('the group views are registered; unknown, absent or prototype names resolve to null', () => {
    expect(Object.keys(TEMPLATE_VIEWS)).toEqual(
      expect.arrayContaining(['progress_list', 'cap_list', 'rewards_fy', 'heatmap']),
    );
    expect(templateView('progress_list')).toBe(TEMPLATE_VIEWS.progress_list);
    expect(templateView('no_such_view')).toBeNull();
    expect(templateView(null)).toBeNull();
    expect(templateView('constructor')).toBeNull();
  });

  it('a registered view is found from the server `view` name of a template built-in only', () => {
    const View = (_: TemplateViewProps) => null;
    views.test_view = View;
    expect(builtinViewName(builtin('x', 'template', 'TABLE', { view: 'test_view' }))).toBe('test_view');
    expect(templateViewOf(builtin('x', 'template', 'TABLE', { view: 'test_view' }))).toBe(View);
    expect(templateViewOf(builtin('x', 'template', 'TABLE', { view: 'other' }))).toBeNull();
    expect(templateViewOf(builtin('x', 'template', 'TABLE'))).toBeNull();
    expect(templateViewOf(builtin('x', 'component', null, { view: 'test_view' }))).toBeNull();
    expect(builtinViewName(builtin('x', 'template', 'TABLE', { view: '' }))).toBeNull();
    expect(builtinViewName(report())).toBeNull();
  });

  describe('in DashboardWidgetView', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      vi.mocked(api.POST).mockResolvedValue({ data: table } as never);
    });

    it('renders the loaded data through a registered view', async () => {
      views.test_view = ({ data, widget }: TemplateViewProps) => (
        <div data-testid="custom-view">{`${widget.builtinKey}:${data.type}`}</div>
      );
      renderWithQuery(<DashboardWidgetView widget={builtin('caps', 'template', 'TABLE', { view: 'test_view' })} />);
      expect(await screen.findByTestId('custom-view')).toHaveTextContent('caps:TABLE');
      expect(screen.queryByText('Plain table row')).not.toBeInTheDocument();
    });

    it('keeps the shared skeleton while a custom-view widget loads', () => {
      vi.mocked(api.POST).mockReturnValue(new Promise(() => {}) as never);
      views.test_view = () => <div data-testid="custom-view" />;
      renderWithQuery(<DashboardWidgetView widget={builtin('caps', 'template', 'TABLE', { view: 'test_view' })} />);
      expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('custom-view')).not.toBeInTheDocument();
    });

    it('falls back to the templateType rendering for a view the client does not know', async () => {
      renderWithQuery(<DashboardWidgetView widget={builtin('caps', 'template', 'TABLE', { view: 'unknown_view' })} />);
      expect(await screen.findByText('Plain table row')).toBeInTheDocument();
    });

    it('renders a component body with the normalized params', () => {
      renderWithQuery(
        <DashboardWidgetView widget={builtin('bills_due', 'component', null, {}, { params: { accountId: 'c1', junk: null } })} />,
      );
      expect(screen.getByTestId('bills-widget')).toHaveAttribute('data-account', 'c1');
      expect(screen.getByTestId('bills-widget')).toHaveClass('h-full');
      expect(api.POST).not.toHaveBeenCalled();
    });

    it('a component built-in whose entry has no body shows the placeholder', () => {
      renderWithQuery(<DashboardWidgetView widget={builtin('net_worth', 'component', null)} />);
      expect(screen.getByText('This widget is no longer available.')).toBeInTheDocument();
    });
  });
});

describe('subtitle and phone slot', () => {
  it('uses the server subtitle when the registry has none for the widget', () => {
    render(<WidgetSubtitle widget={builtin('top_movers', 'component', null, { subtitle: 'Since last close' })} />);
    expect(screen.getByText('Since last close')).toHaveClass('text-2xs');
  });

  it('prefers the registry subtitle; upcoming without days defers to the server one', () => {
    const { unmount } = render(<WidgetSubtitle widget={builtin('net_worth', 'template', 'KPI', { subtitle: 'Server line' })} />);
    expect(screen.getByText('All accounts')).toBeInTheDocument();
    expect(screen.queryByText('Server line')).not.toBeInTheDocument();
    unmount();
    render(<WidgetSubtitle widget={builtin('upcoming', 'template', 'TABLE', { subtitle: 'Soonest first' })} />);
    expect(screen.getByText('Soonest first')).toBeInTheDocument();
  });

  it('renders nothing without either, and for an empty server subtitle', () => {
    const { container } = render(<WidgetSubtitle widget={builtin('new_one', 'component', null, { subtitle: '' })} />);
    expect(container).toBeEmptyDOMElement();
    expect(serverSubtitle(report())).toBeNull();
  });

  it('phone slot: the entry`s own, else by shape (unknown component built-ins size to content)', () => {
    expect(phoneSlot(builtin('bills_due', 'component', null))).toEqual({ fit: 'content' });
    expect(phoneSlot(builtin('new_one', 'component', null))).toEqual({ fit: 'content' });
    expect(phoneSlot(builtin('net_worth', 'template', 'KPI'))).toEqual({ fit: 'fill', className: 'h-[140px]' });
    expect(phoneSlot(builtin('x', 'template', 'CHART'))).toEqual({ fit: 'fill', className: 'h-80' });
    expect(phoneSlot(report())).toEqual({ fit: 'fill', className: 'h-80' });
  });

  it('phone slot: a registered entry`s own slot wins over its shape', () => {
    registry.test_slot = { icon: Wallet, phone: { fit: 'fill', className: 'h-40' } };
    try {
      expect(phoneSlot(builtin('test_slot', 'template', 'KPI'))).toEqual({ fit: 'fill', className: 'h-40' });
    } finally {
      delete registry.test_slot;
    }
  });
});
