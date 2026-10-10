import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/toastError', () => ({ toastError }));
const phone = vi.hoisted(() => ({ value: false }));
vi.mock('@/lib/useMediaQuery', () => ({ BELOW_MD_QUERY: 'q', useMediaQuery: () => phone.value }));
const grid = vi.hoisted(() => ({ props: null as null | { layout: Array<Record<string, unknown>> } }));
vi.mock('react-grid-layout/legacy', () => ({
  __esModule: true,
  default: (props: { children: ReactNode }) => {
    grid.props = props as never;
    return <div data-testid="rgl">{props.children}</div>;
  },
  WidthProvider: (c: unknown) => c,
}));
vi.mock('react-grid-layout/css/styles.css', () => ({}));
vi.mock('react-resizable/css/styles.css', () => ({}));

import { DashboardGrid } from '@/components/dashboards/DashboardGrid';
import { DashboardStack } from '@/components/dashboards/DashboardStack';
import { DashboardTextWidget } from '@/components/dashboards/DashboardTextWidget';
import { DashboardView } from '@/components/dashboards/DashboardView';
import {
  applyLayout,
  editSignature,
  textWidgetResponse,
  updateTextWidget,
  widthStops,
} from '@/components/dashboards/editor/dashboardEditor.helpers';
import { DashboardEditorHeader } from '@/components/dashboards/editor/DashboardEditorHeader';
import { useDashboardEditor } from '@/components/dashboards/editor/useDashboardEditor';
import { api } from '@/lib/api/client';
import type { DashboardResponse, WidgetResponse } from '@/lib/dashboards.types';
import { createTestQueryClient } from '@/test/renderWithQuery';

const header = (id: string, title: string, description?: string, y = 0): WidgetResponse => ({
  id, kind: 'text', reportId: null, builtinKey: null, title,
  params: description ? { description } : null,
  layout: { x: 0, y, w: 100, h: description ? 6 : 5 },
});
const report = (id: string, y = 0): WidgetResponse => ({
  id, kind: 'report', reportId: `rep-${id}`, title: null, layout: { x: 0, y, w: 50, h: 10 },
  report: { name: id, type: 'KPI', available: true },
});

describe('section header editor transforms', () => {
  it('a new header is untitled, full width, 5 rows tall, below every widget', () => {
    const w = textWidgetResponse([report('a', 0), report('b', 10)]);
    expect(w).toMatchObject({ kind: 'text', title: '', params: null, layout: { x: 0, y: 20, w: 100, h: 5 } });
  });

  it('editing the title keeps the description and height', () => {
    const [w] = updateTextWidget([header('h', 'Old', 'Desc')], 'h', { title: 'New' });
    expect(w).toMatchObject({ title: 'New', params: { description: 'Desc' }, layout: { h: 6 } });
  });

  it('adding a description grows the header one row; clearing it shrinks it back and drops params', () => {
    const [grown] = updateTextWidget([header('h', 'T')], 'h', { description: 'Cards only' });
    expect(grown).toMatchObject({ params: { description: 'Cards only' }, layout: { h: 6 } });
    const [shrunk] = updateTextWidget([grown], 'h', { description: '' });
    expect(shrunk).toMatchObject({ params: null, layout: { h: 5 } });
  });

  it('a whitespace-only description does not grow the header', () => {
    const [w] = updateTextWidget([header('h', 'T')], 'h', { description: '   ' });
    expect(w.layout.h).toBe(5);
  });

  it('leaves other widgets, and non-header widgets with the same id, untouched', () => {
    const r = report('h');
    expect(updateTextWidget([r], 'h', { title: 'X' })[0]).toBe(r);
    const other = header('o', 'Other');
    expect(updateTextWidget([header('h', 'T'), other], 'h', { title: 'X' })[1]).toBe(other);
  });

  it('the grid can move a header but never change its width, column or height', () => {
    const h = header('h', 'T', undefined, 0);
    const [moved] = applyLayout([h], [{ i: 'h', x: 30, y: 12, w: 40, h: 20 }]);
    expect(moved.layout).toEqual({ x: 0, y: 12, w: 100, h: 5 });
  });

  it('a header has no width toggle', () => {
    expect(widthStops(header('h', 'T'))).toEqual([]);
  });

  it('the dirty signature changes with the title, description and position', () => {
    const base = editSignature('D', '', [header('h', 'T')]);
    expect(editSignature('D', '', [header('h', 'T2')])).not.toBe(base);
    expect(editSignature('D', '', [header('h', 'T', 'Desc')])).not.toBe(base);
    expect(editSignature('D', '', [header('h', 'T', undefined, 8)])).not.toBe(base);
    expect(editSignature('D', '', [header('h', 'T')])).toBe(base);
  });
});

const dashboard = (widgets: WidgetResponse[]) =>
  ({ id: 'd1', name: 'Home', description: '', isDefault: false, widgets }) as DashboardResponse;

describe('useDashboardEditor headers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mount = (d?: DashboardResponse) => {
    const qc = createTestQueryClient();
    const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    return renderHook(() => useDashboardEditor({ mode: d ? 'edit' : 'create', dashboard: d }), { wrapper: Wrapper });
  };

  it('addHeader appends an untitled header and marks the dashboard dirty', () => {
    const { result } = mount(dashboard([report('r')]));
    act(() => result.current.startEdit());
    expect(result.current.isDirty).toBe(false);
    act(() => result.current.addHeader());
    const added = result.current.widgets[1];
    expect(added).toMatchObject({ kind: 'text', title: '', layout: { x: 0, y: 10, w: 100, h: 5 } });
    expect(result.current.isDirty).toBe(true);
  });

  it('updateHeader edits the title and description', () => {
    const { result } = mount(dashboard([header('h', 'Spending')]));
    act(() => result.current.updateHeader('h', { title: 'Investments' }));
    act(() => result.current.updateHeader('h', { description: 'Mutual funds' }));
    expect(result.current.widgets[0]).toMatchObject({ title: 'Investments', params: { description: 'Mutual funds' }, layout: { h: 6 } });
  });

  it('removeWidget removes a header', () => {
    const { result } = mount(dashboard([header('h', 'A'), report('r', 5)]));
    act(() => result.current.removeWidget('h'));
    expect(result.current.widgets.map((w) => w.id)).toEqual(['r']);
  });

  it('saves a header as kind text with its trimmed title and description', async () => {
    const saved = dashboard([header('h', 'Spending', 'Cards only')]);
    vi.mocked(api.PUT).mockResolvedValue({ data: saved } as never);
    const { result } = mount(dashboard([{ ...header('h', '  Spending  '), params: { description: ' Cards only ' }, layout: { x: 0, y: 0, w: 100, h: 6 } }]));
    await act(async () => { await result.current.save(); });
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/dashboards/{id}', {
      params: { path: { id: 'd1' } },
      body: {
        name: 'Home', description: undefined, isDefault: false,
        widgets: [{ id: 'h', kind: 'text', reportId: null, builtinKey: null, params: { description: 'Cards only' }, title: 'Spending', layout: { x: 0, y: 0, w: 100, h: 6 } }],
      },
    });
  });

  it('saves a header without a description with null params', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: dashboard([header('h', 'A')]) } as never);
    const { result } = mount(dashboard([header('h', 'A')]));
    await act(async () => { await result.current.save(); });
    const body = vi.mocked(api.PUT).mock.calls[0][1] as { body: { widgets: Array<{ params: unknown }> } };
    expect(body.body.widgets[0].params).toBeNull();
  });

  it('blocks save while a header has no title', async () => {
    const { result } = mount(dashboard([report('r')]));
    act(() => result.current.startEdit());
    act(() => result.current.addHeader());
    await act(async () => { await result.current.save(); });
    expect(toast.error).toHaveBeenCalledWith('Give every header a title.');
    expect(api.PUT).not.toHaveBeenCalled();
  });
});

describe('DashboardTextWidget', () => {
  it('view: renders the title as a heading and the description under it', () => {
    render(<DashboardTextWidget widget={header('h', 'Spending', 'Cards and bank accounts')} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Spending' })).toBeInTheDocument();
    expect(screen.getByText('Cards and bank accounts')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('view: no description line when there is none', () => {
    render(<DashboardTextWidget widget={header('h', 'Spending')} />);
    expect(screen.getByTestId('dashboard-header').querySelector('p')).toBeNull();
  });

  it('edit: is the drag handle, with title and description inputs and no width toggle', () => {
    render(<DashboardTextWidget widget={header('h', 'Spending', 'Desc')} editing />);
    expect(screen.getByTestId('dashboard-header-edit')).toHaveClass('dashboard-drag-handle');
    expect(screen.getByLabelText('Header title')).toHaveValue('Spending');
    expect(screen.getByLabelText('Header description')).toHaveValue('Desc');
    expect(screen.queryByRole('button', { name: /width/i })).not.toBeInTheDocument();
  });

  it('edit: typing reports title and description changes', () => {
    const onChange = vi.fn();
    render(<DashboardTextWidget widget={header('h', 'A')} editing onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Header title'), { target: { value: 'Spending' } });
    fireEvent.change(screen.getByLabelText('Header description'), { target: { value: 'Cards' } });
    expect(onChange).toHaveBeenNthCalledWith(1, { title: 'Spending' });
    expect(onChange).toHaveBeenNthCalledWith(2, { description: 'Cards' });
  });

  it('edit: an untitled header takes focus; a titled one does not', () => {
    const { unmount } = render(<DashboardTextWidget widget={header('h', '')} editing />);
    expect(screen.getByLabelText('Header title')).toHaveFocus();
    unmount();
    render(<DashboardTextWidget widget={header('h', 'Spending')} editing />);
    expect(screen.getByLabelText('Header title')).not.toHaveFocus();
  });

  it('edit: inputs cap length at the server limits', () => {
    render(<DashboardTextWidget widget={header('h', 'A')} editing />);
    expect(screen.getByLabelText('Header title')).toHaveAttribute('maxLength', '120');
    expect(screen.getByLabelText('Header description')).toHaveAttribute('maxLength', '300');
  });

  it('edit: Remove header calls onRemove', async () => {
    const onRemove = vi.fn();
    render(<DashboardTextWidget widget={header('h', 'A')} editing onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove header' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});

describe('headers on the grid and the phone stack', () => {
  beforeEach(() => {
    phone.value = false;
    grid.props = null;
  });

  it('grid: a header is pinned full width at its own height and not resizable; others keep theirs', () => {
    render(<DashboardGrid widgets={[header('h', 'A', 'D', 0), report('r', 6)]} editing onLayoutChange={vi.fn()} renderWidget={(w) => <i>{w.id}</i>} />);
    const [h, r] = grid.props!.layout;
    expect(h).toMatchObject({ i: 'h', x: 0, w: 100, h: 6, minW: 100, maxW: 100, minH: 6, maxH: 6, isResizable: false });
    expect(r.isResizable).toBeUndefined();
    expect(r).toMatchObject({ minW: 2, minH: 1 });
  });

  it('phone stack: a header sizes to its content', () => {
    const calls: Array<[string, string]> = [];
    render(
      <DashboardStack
        widgets={[header('h', 'A', undefined, 0), report('r', 5)]}
        renderWidget={(w, fit) => {
          calls.push([w.id, fit]);
          return <span data-testid={`w-${w.id}`} />;
        }}
      />,
    );
    expect(calls).toEqual([['h', 'content'], ['r', 'fill']]);
  });

  it('DashboardView renders headers as text, without a widget card', () => {
    render(<DashboardView dashboard={dashboard([header('h', 'Spending')])} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Spending' })).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-widget')).not.toBeInTheDocument();
  });
});

describe('DashboardEditorHeader', () => {
  it('shows Add header while editing and calls onAddHeader', async () => {
    const onAddHeader = vi.fn();
    const qc = createTestQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <DashboardEditorHeader
          mode="edit" editing isDirty={false} name="Home" setName={vi.fn()} description="" saving={false}
          reports={[]} onDiscardAndExit={vi.fn()} onStartEdit={vi.fn()} onAddWidget={vi.fn()}
          onAddBuiltin={vi.fn()} onAddHeader={onAddHeader} onSave={vi.fn()}
        />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add header' }));
    expect(onAddHeader).toHaveBeenCalledOnce();
  });

  it('has no Add header outside edit mode', () => {
    render(
      <DashboardEditorHeader
        mode="edit" editing={false} isDirty={false} name="Home" setName={vi.fn()} description="" saving={false}
        reports={[]} onDiscardAndExit={vi.fn()} onStartEdit={vi.fn()} onAddWidget={vi.fn()}
        onAddBuiltin={vi.fn()} onAddHeader={vi.fn()} onSave={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Add header' })).not.toBeInTheDocument();
  });
});
