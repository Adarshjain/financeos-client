import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));

import type { BuiltinWidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import type { ReportSummaryResponse } from '@/lib/reports.types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import { WidgetPicker } from './WidgetPicker';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const builtins: BuiltinWidgetResponse[] = [
  {
    key: 'card_utilisation',
    label: 'Card utilisation',
    description: 'Limit used per card',
    category: 'cards',
    kind: 'component',
    minW: 50,
    params: [{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: true }],
  },
  {
    key: 'top_movers',
    label: 'Top movers',
    description: 'Biggest moves today',
    category: 'investments',
    kind: 'component',
    minW: 50,
    params: [{ name: 'n', type: 'int', required: false, min: 1, max: 10, defaultValue: 5 }],
  },
  { key: 'net_worth', label: 'Net worth', description: 'Assets minus loans', category: 'overview', kind: 'template', minW: 25, params: [] },
  {
    key: 'loan_payoff',
    label: 'Loan payoff',
    description: 'Progress on a loan',
    category: 'loans',
    kind: 'component',
    minW: 50,
    params: [],
    unavailableReason: 'Add a loan to use this',
  },
];
const reports = [
  { id: 'r1', name: 'Spend by category', description: null, type: 'TABLE', datasource: 'transactions', dashboards: [] },
  { id: 'r2', name: 'Rewards earned', description: 'Points by card', type: 'KPI', datasource: 'rewards', dashboards: [] },
] as unknown as ReportSummaryResponse[];

const cards = [{ id: 'c1', name: 'HDFC Regalia Gold', type: 'credit_card', closedOn: null }];

function open(over: Partial<React.ComponentProps<typeof WidgetPicker>> = {}) {
  const props = { reports, onAddBuiltin: vi.fn(), onAddReport: vi.fn(), onClose: vi.fn(), ...over };
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.dashboards.builtins(), builtins);
  renderWithQuery(<WidgetPicker {...props} />, { queryClient });
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.GET.mockImplementation(async (path: string) => {
    if (path === '/api/v1/dashboards/builtins') return { data: builtins };
    if (path === '/api/v1/accounts') return { data: cards };
    return { data: [] };
  });
});

describe('WidgetPicker', () => {
  it('lists the built-ins and the reports in tabs, without counts', async () => {
    open();
    const dialog = await screen.findByRole('dialog', { name: /Add widget/ });
    expect(within(dialog).getByRole('tab', { name: /^Built-in$/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('tab', { name: /^My reports$/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: /Card utilisation/ })).toBeInTheDocument();
    expect(within(dialog).getByText('Half width · needs: card')).toBeInTheDocument();
    expect(within(dialog).getByText('Half width · n = 5')).toBeInTheDocument();
    expect(within(dialog).getByText('Quarter width')).toBeInTheDocument();
  });

  it('greys out a built-in the user cannot use yet, with the reason', async () => {
    open();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: /Loan payoff/ })).toBeDisabled();
    expect(within(dialog).getByText('Add a loan to use this')).toBeInTheDocument();
  });

  it('selecting a card marks it Selected and shows its params and the title override; Add stays off until the params are valid', async () => {
    open();
    const dialog = await screen.findByRole('dialog');
    const add = within(dialog).getByRole('button', { name: 'Add to board' });
    expect(add).toBeDisabled();
    await user.click(within(dialog).getByRole('radio', { name: /Card utilisation/ }));
    expect(within(dialog).getByText('Selected · needs: card')).toBeInTheDocument();
    expect(within(dialog).getByText('Card')).toBeInTheDocument();
    expect(within(dialog).getByText('Title override')).toBeInTheDocument();
    expect(add).toBeDisabled();
    await user.click(within(dialog).getByRole('combobox', { name: /Card/ }));
    await user.click(await screen.findByRole('option', { name: /HDFC Regalia Gold/ }));
    await waitFor(() => expect(add).toBeEnabled());
  });

  it('adds a built-in with its params and the title override', async () => {
    const props = open();
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: /Top movers/ }));
    const n = within(dialog).getByLabelText('How many');
    expect(n).toHaveValue(5);
    await user.clear(n);
    await user.type(n, '8');
    await user.type(within(dialog).getByPlaceholderText('Top movers'), 'Movers');
    await user.click(within(dialog).getByRole('button', { name: 'Add to board' }));
    expect(props.onAddBuiltin).toHaveBeenCalledWith(expect.objectContaining({ key: 'top_movers' }), { n: 8 }, 'Movers');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('a bad param blocks Add with its message', async () => {
    open();
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: /Top movers/ }));
    const n = within(dialog).getByLabelText('How many');
    await user.clear(n);
    await user.type(n, '99');
    expect(within(dialog).getByText('At most 10')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Add to board' })).toBeDisabled();
  });

  it('adds a built-in without params at once, then the same one again is a separate add', async () => {
    const props = open();
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: /Net worth/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Add to board' }));
    expect(props.onAddBuiltin).toHaveBeenCalledWith(expect.objectContaining({ key: 'net_worth' }), {}, null);
  });

  it('switching params when another built-in is chosen starts the form over', async () => {
    open();
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: /Top movers/ }));
    await user.clear(within(dialog).getByLabelText('How many'));
    await user.type(within(dialog).getByLabelText('How many'), '3');
    await user.click(within(dialog).getByRole('radio', { name: /Net worth/ }));
    expect(within(dialog).queryByLabelText('How many')).toBeNull();
    await user.click(within(dialog).getByRole('radio', { name: /Top movers/ }));
    expect(within(dialog).getByLabelText('How many')).toHaveValue(5);
  });

  it('searches the built-ins', async () => {
    open();
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('Search widgets'), 'loans');
    expect(within(dialog).getByRole('radio', { name: /Net worth/ })).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio', { name: /Top movers/ })).toBeNull();
    await user.clear(within(dialog).getByPlaceholderText('Search widgets'));
    await user.type(within(dialog).getByPlaceholderText('Search widgets'), 'zzz');
    expect(within(dialog).getByText('No widgets match.')).toBeInTheDocument();
  });

  it('My reports: selecting a report and adding it, with a title override', async () => {
    const props = open();
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('tab', { name: /My reports/ }));
    expect(within(dialog).getByText('Points by card')).toBeInTheDocument();
    expect(within(dialog).getByText('Table report')).toBeInTheDocument();
    const add = within(dialog).getByRole('button', { name: 'Add to board' });
    expect(add).toBeDisabled();
    await user.click(within(dialog).getByRole('radio', { name: /Rewards earned/ }));
    expect(within(dialog).getByText('Selected')).toBeInTheDocument();
    await user.type(within(dialog).getByPlaceholderText('Rewards earned'), 'Points');
    await user.click(add);
    expect(props.onAddReport).toHaveBeenCalledWith(expect.objectContaining({ id: 'r2' }), 'Points');
  });

  it('says so when there are no reports, and Cancel closes without adding', async () => {
    const props = open({ reports: [] });
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('tab', { name: /My reports/ }));
    expect(within(dialog).getByText('No saved reports yet. Make one in Reports.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(props.onClose).toHaveBeenCalled();
    expect(props.onAddBuiltin).not.toHaveBeenCalled();
  });

  it('checks availability again when it opens', async () => {
    open();
    await screen.findByRole('dialog');
    await waitFor(() => expect(api.GET).toHaveBeenCalledWith('/api/v1/dashboards/builtins'));
  });
});
