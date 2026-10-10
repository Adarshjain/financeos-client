import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const launcher = vi.hoisted(() => ({ launch: vi.fn(), prefetch: vi.fn(), pendingId: null as string | null }));
vi.mock('@/components/shortcuts/actions', async () => {
  const actual = await vi.importActual<typeof import('@/components/shortcuts/actions')>('@/components/shortcuts/actions');
  return { ...actual, useActionLauncher: () => ({ ...launcher, dialog: <div data-testid="launcher-dialog" /> }) };
});

import { DEFAULT_SHORTCUTS } from '@/components/shortcuts/catalog';
import { api } from '@/lib/api/client';
import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DEFAULT_MAX_SHORTCUTS, itemsSpec, moveId, removeId, shortcutIds, toggleId } from '../shortcutsParams';
import { ShortcutsParamsEditor } from '../ShortcutsParamsEditor';
import { ShortcutsWidget } from '../ShortcutsWidget';

const ACC = '11111111-1111-1111-1111-111111111111';
const REP = '22222222-2222-2222-2222-222222222222';
const DASH = '33333333-3333-3333-3333-333333333333';

const LISTS: Record<string, unknown> = {
  '/api/v1/accounts': [{ id: ACC, name: 'HDFC Savings', type: 'bank_account' }],
  '/api/v1/reports': [{ id: REP, name: 'Monthly spend', type: 'KPI' }],
  '/api/v1/dashboards': [{ id: DASH, name: 'Investments', widgets: [] }],
};
const serveLists = () =>
  vi.mocked(api.GET).mockImplementation((async (url: string) => ({ data: LISTS[url] })) as never);

describe('shortcutsParams', () => {
  it('shortcutIds: the stored list, else the defaults', () => {
    expect(shortcutIds({ items: ['page:/upcoming'] })).toEqual(['page:/upcoming']);
    expect(shortcutIds({})).toEqual(DEFAULT_SHORTCUTS);
    expect(shortcutIds({ items: 'page:/x' })).toEqual(DEFAULT_SHORTCUTS);
    expect(shortcutIds({ items: [1, 2] })).toEqual(DEFAULT_SHORTCUTS);
  });

  it('itemsSpec: the spec default and maxItems, else the client defaults and 12', () => {
    const def = (params: BuiltinWidgetResponse['params']) => ({ params }) as BuiltinWidgetResponse;
    expect(itemsSpec(def([{ name: 'items', type: 'string_list', required: false, defaultValue: ['page:/x'], maxItems: 6 }]))).toEqual({
      defaults: ['page:/x'],
      max: 6,
    });
    expect(itemsSpec(def([]))).toEqual({ defaults: DEFAULT_SHORTCUTS, max: DEFAULT_MAX_SHORTCUTS });
  });

  it('toggleId adds at the end under the limit, removes but never the last one', () => {
    expect(toggleId(['a'], 'b', 3)).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b', 'c'], 'd', 3)).toEqual(['a', 'b', 'c']);
    expect(toggleId(['a', 'b'], 'a', 3)).toEqual(['b']);
    expect(toggleId(['a'], 'a', 3)).toEqual(['a']);
  });

  it('moveId swaps with a neighbour; edges are no-ops', () => {
    expect(moveId(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveId(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveId(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveId(['a', 'b'], 5, -1)).toEqual(['a', 'b']);
    expect(removeId(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('removeId never empties the list', () => {
    expect(removeId(['gone'], 'gone')).toEqual(['gone']);
  });
});

describe('ShortcutsWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    launcher.pendingId = null;
    serveLists();
  });

  it('renders the default tiles in order: action button first, then page links', () => {
    renderWithQuery(<ShortcutsWidget ids={DEFAULT_SHORTCUTS} />);
    const tiles = within(screen.getByRole('list', { name: 'Shortcuts' })).getAllByRole('listitem');
    expect(tiles.map((t) => t.textContent)).toEqual(['Add transaction', expect.any(String), expect.any(String), expect.any(String)]);
    expect(within(tiles[0]).getByRole('button', { name: 'Add transaction' })).toBeInTheDocument();
    expect(within(tiles[1]).getByRole('link')).toHaveAttribute('href', '/transactions/review');
    expect(within(tiles[2]).getByRole('link')).toHaveAttribute('href', '/transactions/import');
    expect(within(tiles[3]).getByRole('link')).toHaveAttribute('href', '/upcoming');
    // Nothing is fetched for pages and actions.
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('account, report and dashboard tiles link to them once their lists load; unknown ids are hidden', async () => {
    renderWithQuery(
      <ShortcutsWidget ids={[`account:${ACC}`, `report:${REP}`, `dashboard:${DASH}`, 'page:/nope', 'bogus', 'action:import-statement']} />,
    );
    expect(await screen.findByRole('link', { name: 'HDFC Savings' })).toHaveAttribute('href', `/accounts/${ACC}`);
    expect(screen.getByRole('link', { name: 'Monthly spend' })).toHaveAttribute('href', `/reports/${REP}`);
    expect(screen.getByRole('link', { name: 'Investments' })).toHaveAttribute('href', `/dashboards/${DASH}`);
    // A page action is a link too.
    expect(screen.getByRole('link', { name: 'Import statement' })).toHaveAttribute('href', '/transactions/import');
    expect(within(screen.getByRole('list', { name: 'Shortcuts' })).getAllByRole('listitem')).toHaveLength(4);
  });

  it('shows placeholders while only not-yet-loaded lists are needed', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<ShortcutsWidget ids={[`account:${ACC}`]} />);
    expect(screen.getByTestId('shortcuts-loading')).toBeInTheDocument();
  });

  it('nothing resolvable → a hint to pick some', async () => {
    renderWithQuery(<ShortcutsWidget ids={['page:/nope']} />);
    expect(screen.getByText('No shortcuts')).toBeInTheDocument();
  });

  it('a dialog action prefetches on hover / focus / touch and launches on click', async () => {
    renderWithQuery(<ShortcutsWidget ids={['action:record-lending']} />);
    const tile = screen.getByRole('button', { name: 'Record lending' });
    fireEvent.pointerEnter(tile);
    fireEvent.focus(tile);
    fireEvent.touchStart(tile);
    expect(launcher.prefetch).toHaveBeenCalledTimes(3);
    expect(launcher.prefetch).toHaveBeenCalledWith('record-lending');
    expect(launcher.launch).not.toHaveBeenCalled();
    await userEvent.click(tile);
    expect(launcher.launch).toHaveBeenCalledWith('record-lending');
    expect(screen.getByTestId('launcher-dialog')).toBeInTheDocument();
  });

  it('the loading action\'s tile spins and is disabled; others are not', () => {
    launcher.pendingId = 'add-transaction';
    renderWithQuery(<ShortcutsWidget ids={['action:add-transaction', 'action:record-lending']} />);
    const add = screen.getByRole('button', { name: 'Add transaction' });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('aria-busy', 'true');
    expect(add.querySelector('.animate-spin')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Record lending' })).toBeEnabled();
  });

  it('4 tiles a row on a phone, auto-fit from md up', () => {
    renderWithQuery(<ShortcutsWidget ids={DEFAULT_SHORTCUTS} />);
    const grid = screen.getByRole('list', { name: 'Shortcuts' });
    expect(grid.className).toContain('grid-cols-4');
    expect(grid.className).toContain('md:[grid-template-columns:repeat(auto-fill,minmax(6.5rem,1fr))]');
  });
});

const DEF = {
  key: 'shortcuts',
  label: 'Shortcuts',
  description: '',
  kind: 'component',
  minW: 25,
  category: 'shortcuts',
  params: [{ name: 'items', type: 'string_list', required: false, defaultValue: [...DEFAULT_SHORTCUTS], maxItems: 5 }],
} as BuiltinWidgetResponse;

/** The editor under a parent that keeps its value, recording every change. */
function Harness({ initial, onChange }: { initial: WidgetParams; onChange: (p: WidgetParams) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <ShortcutsParamsEditor
      def={DEF}
      value={value}
      onChange={(p) => {
        setValue(p);
        onChange(p);
      }}
    />
  );
}

const chosen = () =>
  within(screen.getByRole('list', { name: 'Chosen shortcuts' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('ShortcutsParamsEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    serveLists();
  });

  it('starts from the spec defaults when the param is absent, with a counter against maxItems', async () => {
    renderWithQuery(<Harness initial={{}} onChange={vi.fn()} />);
    expect(chosen()).toHaveLength(4);
    expect(chosen()[0]).toBe('Add transaction');
    expect(screen.getByText('4 of 5')).toBeInTheDocument();
  });

  it('groups the catalog Pages / Actions / Accounts / Reports / Dashboards', async () => {
    renderWithQuery(<Harness initial={{}} onChange={vi.fn()} />);
    await screen.findByLabelText('HDFC Savings');
    const legends = screen.getAllByRole('group').map((g) => g.querySelector('legend')?.textContent);
    expect(legends).toEqual(['Pages', 'Actions', 'Accounts', 'Reports', 'Dashboards']);
    expect(within(screen.getByRole('group', { name: 'Reports' })).getByLabelText('Monthly spend')).toBeInTheDocument();
  });

  it('ticking adds at the end, unticking removes, keeping the other params', async () => {
    const onChange = vi.fn();
    renderWithQuery(<Harness initial={{ items: ['page:/upcoming'], other: 1 }} onChange={onChange} />);
    await userEvent.click(await screen.findByLabelText('HDFC Savings'));
    expect(onChange).toHaveBeenLastCalledWith({ items: ['page:/upcoming', `account:${ACC}`], other: 1 });
    await userEvent.click(within(screen.getByRole('group', { name: 'Actions' })).getByLabelText('Record lending'));
    expect(onChange).toHaveBeenLastCalledWith({ items: ['page:/upcoming', `account:${ACC}`, 'action:record-lending'], other: 1 });
    await userEvent.click(screen.getByLabelText('HDFC Savings'));
    expect(onChange).toHaveBeenLastCalledWith({ items: ['page:/upcoming', 'action:record-lending'], other: 1 });
  });

  it('the last chosen shortcut cannot be unticked', async () => {
    renderWithQuery(<Harness initial={{ items: ['action:add-transaction'] }} onChange={vi.fn()} />);
    expect(within(screen.getByRole('group', { name: 'Actions' })).getByLabelText('Add transaction')).toBeDisabled();
  });

  it('at the limit unticked rows are disabled; ticked ones stay editable', async () => {
    const full = ['action:add-transaction', 'action:record-lending', 'action:ask-chat', 'action:review-queue', 'action:import-statement'];
    renderWithQuery(<Harness initial={{ items: full }} onChange={vi.fn()} />);
    expect(screen.getByText('5 of 5')).toBeInTheDocument();
    expect(await screen.findByLabelText('HDFC Savings')).toBeDisabled();
    expect(within(screen.getByRole('group', { name: 'Actions' })).getByLabelText('Ask chat')).toBeEnabled();
  });

  it('Move up / Move down reorder; the ends are disabled', async () => {
    const onChange = vi.fn();
    renderWithQuery(<Harness initial={{ items: ['action:add-transaction', 'action:ask-chat'] }} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Move Add transaction up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Ask chat down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Ask chat up' }));
    expect(onChange).toHaveBeenLastCalledWith({ items: ['action:ask-chat', 'action:add-transaction'] });
    expect(chosen()).toEqual(['Ask chat', 'Add transaction']);
    await userEvent.click(screen.getByRole('button', { name: 'Move Ask chat down' }));
    expect(chosen()).toEqual(['Add transaction', 'Ask chat']);
  });

  it('search narrows the catalog by label; no match says so', async () => {
    renderWithQuery(<Harness initial={{}} onChange={vi.fn()} />);
    await screen.findByLabelText('HDFC Savings');
    await userEvent.type(screen.getByLabelText('Add or remove'), 'hdfc');
    expect(screen.getAllByRole('group')).toHaveLength(1);
    expect(screen.getByLabelText('HDFC Savings')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Add or remove'));
    await userEvent.type(screen.getByLabelText('Add or remove'), 'zzz');
    expect(screen.queryAllByRole('group')).toHaveLength(0);
    expect(screen.getByText('Nothing matches “zzz”')).toBeInTheDocument();
  });

  it('a chosen item that no longer exists can be removed', async () => {
    const onChange = vi.fn();
    const gone = 'account:99999999-9999-9999-9999-999999999999';
    renderWithQuery(<Harness initial={{ items: ['action:add-transaction', gone] }} onChange={onChange} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove unavailable shortcut' }));
    expect(onChange).toHaveBeenLastCalledWith({ items: ['action:add-transaction'] });
  });

  it('the only chosen shortcut, even one no longer available, cannot be removed (never an empty list)', async () => {
    const onChange = vi.fn();
    const gone = 'account:99999999-9999-9999-9999-999999999999';
    renderWithQuery(<Harness initial={{ items: [gone] }} onChange={onChange} />);
    const remove = await screen.findByRole('button', { name: 'Remove unavailable shortcut' });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'Pick another shortcut first');
    await userEvent.click(remove);
    expect(onChange).not.toHaveBeenCalled();
    // Picking another first makes it removable.
    await userEvent.click(within(screen.getByRole('group', { name: 'Actions' })).getByLabelText('Ask chat'));
    await userEvent.click(screen.getByRole('button', { name: 'Remove unavailable shortcut' }));
    expect(onChange).toHaveBeenLastCalledWith({ items: ['action:ask-chat'] });
  });

  it('an empty stored list asks for at least one', () => {
    renderWithQuery(<Harness initial={{ items: [] }} onChange={vi.fn()} />);
    expect(screen.getByText('Pick at least one shortcut.')).toBeInTheDocument();
    expect(screen.getByText('0 of 5')).toBeInTheDocument();
  });
});
