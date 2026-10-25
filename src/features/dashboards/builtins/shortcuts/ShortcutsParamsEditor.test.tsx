import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

import type { BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { shortcutCatalog } from './shortcutsCatalog';
import { ShortcutsParamsEditor } from './ShortcutsParamsEditor';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const def: BuiltinWidgetResponse = {
  key: 'shortcuts',
  label: 'Shortcuts',
  description: '',
  category: 'overview',
  kind: 'component',
  minW: 25,
  params: [{ name: 'items', type: 'string_list', required: false, maxItems: 3, defaultValue: ['page:/inbox', 'page:/upcoming'] }],
};

function show(value: WidgetParams) {
  const onChange = vi.fn();
  renderWithQuery(<ShortcutsParamsEditor def={def} value={value} onChange={onChange} />);
  return onChange;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.GET.mockImplementation(async (path: string) => {
    if (path === '/api/v1/accounts') return { data: [{ id: 'a1', name: 'Salary', type: 'bank_account', closedOn: null }] };
    if (path === '/api/v1/reports') return { data: [{ id: 'r1', name: 'Spend by category' }] };
    if (path === '/api/v1/dashboards') return { data: [{ id: 'd1', name: 'Money overview' }] };
    return { data: [] };
  });
});

describe('shortcutCatalog', () => {
  it('lists pages, actions, then the user\'s accounts, reports and dashboards, by stored id', () => {
    const items = shortcutCatalog({
      accounts: [{ id: 'a1', name: 'Salary' }] as never,
      reports: [{ id: 'r1', name: 'Spend' }] as never,
      dashboards: [{ id: 'd1', name: 'Money' }] as never,
    });
    expect(items.map((i) => i.kind)).toEqual(expect.arrayContaining(['page', 'action', 'account', 'report', 'dashboard']));
    expect(items.find((i) => i.id === 'page:/inbox')).toMatchObject({ label: 'Inbox', href: '/inbox' });
    expect(items.find((i) => i.id === 'action:add-transaction')).toMatchObject({ label: 'Add transaction', href: null, actionId: 'add-transaction' });
    expect(items.find((i) => i.id === 'account:a1')).toMatchObject({ label: 'Salary', href: '/accounts/a1' });
    expect(items.find((i) => i.id === 'report:r1')).toMatchObject({ href: '/reports/r1' });
    expect(items.find((i) => i.id === 'dashboard:d1')).toMatchObject({ href: '/dashboards/d1' });
  });

  it('has only pages and actions before the user\'s lists load', () => {
    expect(shortcutCatalog().every((i) => i.kind === 'page' || i.kind === 'action')).toBe(true);
  });
});

describe('ShortcutsParamsEditor', () => {
  it('shows the chosen shortcuts in order with a counter against the limit, from the defaults when none are stored', async () => {
    show({});
    const list = await screen.findByTestId('shortcuts-params-editor');
    expect(within(list).getByText('2 of 3')).toBeInTheDocument();
    // The re-rank list: one row each, the first cannot go up and the last cannot go down.
    const up = within(list).getAllByRole('button', { name: /Move up/ });
    const down = within(list).getAllByRole('button', { name: /Move down/ });
    expect(up.map((b) => b.getAttribute('aria-label'))).toEqual(['Move up Inbox', 'Move up Upcoming']);
    expect(up[0]).toBeDisabled();
    expect(down[1]).toBeDisabled();
  });

  it('Move down re-ranks the list', async () => {
    const onChange = show({ items: ['page:/inbox', 'page:/upcoming'] });
    await screen.findByText('2 of 3');
    await user.click(screen.getAllByRole('button', { name: /Move down/ })[0]);
    expect(onChange).toHaveBeenCalledWith({ items: ['page:/upcoming', 'page:/inbox'] });
  });

  it('picking another from the dropdown adds it at the end', async () => {
    const onChange = show({ items: ['page:/inbox'] });
    await user.click(await screen.findByRole('combobox', { name: /Shortcuts/ }));
    await user.click(await screen.findByRole('option', { name: 'Salary' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ items: ['page:/inbox', 'account:a1'] }));
  });

  it('at the limit the unchosen ones are disabled', async () => {
    show({ items: ['page:/inbox', 'page:/transactions', 'page:/upcoming'] });
    await user.click(await screen.findByRole('combobox', { name: /Shortcuts/ }));
    expect(await screen.findByRole('option', { name: 'Rules' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('never leaves the list empty', async () => {
    const onChange = show({ items: ['page:/inbox'] });
    await user.click(await screen.findByRole('combobox', { name: /Shortcuts/ }));
    await user.click(await screen.findByRole('option', { name: 'Inbox' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
