import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { AddWidgetDialog } from '@/components/dashboards/AddWidgetDialog';
import { api } from '@/lib/api/client';
import type { BuiltinWidgetResponse } from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';
import { renderWithQuery } from '@/test/renderWithQuery';

const netWorth: BuiltinWidgetResponse = {
  category: 'overview',
  key: 'net_worth', label: 'Net worth', description: 'All accounts', kind: 'template', minW: 50, params: [],
};
const upcoming: BuiltinWidgetResponse = {
  category: 'overview',
  key: 'upcoming', label: 'Upcoming', description: 'Obligations ahead', kind: 'template', minW: 100,
  params: [{ name: 'days', type: 'int', required: false, min: 1, max: 90, defaultValue: 14 }],
};
const bills: BuiltinWidgetResponse = {
  category: 'overview',
  key: 'bills_due', label: 'Bills due', description: 'Card bills', kind: 'component', minW: 100,
  params: [{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: false }],
};
const hidden: BuiltinWidgetResponse = {
  category: 'overview',
  key: 'x', label: 'Other', description: '', kind: 'template', minW: 50,
  params: [{ name: 'note', type: 'string', required: false }],
};

const accounts = [
  { id: 'c1', name: 'HDFC Card', type: 'credit_card', closedOn: null },
  { id: 'c2', name: 'Old Card', type: 'credit_card', closedOn: '2020-01-01' },
  { id: 'b1', name: 'Savings', type: 'bank', closedOn: null },
];

const reports = [{ id: 'r1', name: 'Spend this month', type: 'CHART' }] as ReportSummaryResponse[];

function seed(builtins: BuiltinWidgetResponse[] = [netWorth, upcoming, bills, hidden]) {
  vi.mocked(api.GET).mockImplementation(((url: string) => {
    if (url === '/api/v1/dashboards/builtins') return Promise.resolve({ data: builtins });
    if (url === '/api/v1/accounts') return Promise.resolve({ data: accounts });
    return Promise.resolve({ data: [] });
  }) as never);
}

async function open(onAdd = vi.fn(), onAddBuiltin = vi.fn(), rs = reports) {
  const user = userEvent.setup();
  renderWithQuery(<AddWidgetDialog reports={rs} onAdd={onAdd} onAddBuiltin={onAddBuiltin} />);
  await user.click(screen.getByRole('button', { name: 'Add widget' }));
  return { user, onAdd, onAddBuiltin };
}

describe('AddWidgetDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    seed();
  });

  it('lists built-ins with label and full description (no badges) and the reports section', async () => {
    await open();
    expect(await screen.findByText('Net worth')).toBeInTheDocument();
    expect(screen.getByText('Obligations ahead')).toBeInTheDocument();
    // "Built-in" is only the section heading now, never a per-card badge.
    expect(screen.getAllByText('Built-in')).toHaveLength(1);
    expect(screen.getByText('Built-in').tagName).toBe('H3');
    expect(screen.queryByText(/Half/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Added/)).not.toBeInTheDocument();
    expect(screen.getByText('Spend this month')).toBeInTheDocument();
  });

  it('does not fetch the catalog until the dialog opens', async () => {
    renderWithQuery(<AddWidgetDialog reports={reports} onAdd={vi.fn()} onAddBuiltin={vi.fn()} />);
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('shows an empty note when the catalog is empty', async () => {
    seed([]);
    await open();
    expect(await screen.findByText('No built-in widgets available.')).toBeInTheDocument();
  });

  it('shows a create-report link when there are no reports', async () => {
    await open(vi.fn(), vi.fn(), []);
    expect(await screen.findByRole('link', { name: 'Create one' })).toHaveAttribute('href', '/reports/new');
  });

  it('a param-less built-in opens its details step; Add widget adds it with empty params and closes', async () => {
    const { user, onAddBuiltin } = await open();
    await user.click(await screen.findByText('Net worth'));
    expect(onAddBuiltin).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Net worth' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add widget' }));
    expect(onAddBuiltin).toHaveBeenCalledWith(netWorth, {});
    await waitFor(() => expect(screen.queryByText('Add a widget')).not.toBeInTheDocument());
  });

  it('a built-in with only non-editable params shows no fields and adds with empty params', async () => {
    const { user, onAddBuiltin } = await open();
    await user.click(await screen.findByText('Other'));
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('select')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add widget' }));
    expect(onAddBuiltin).toHaveBeenCalledWith(hidden, {});
  });

  it('adds a saved report through onAdd', async () => {
    const { user, onAdd } = await open();
    await user.click(await screen.findByText('Spend this month'));
    expect(onAdd).toHaveBeenCalledWith(reports[0]);
  });

  describe('int params step', () => {
    async function toStep() {
      const ctx = await open();
      await ctx.user.click(await screen.findByText('Upcoming'));
      return ctx;
    }

    it('prefills the default and shows bounds', async () => {
      await toStep();
      expect(screen.getByLabelText('Days ahead')).toHaveValue(14);
      expect(screen.getByText('Between 1 and 90.')).toBeInTheDocument();
    });

    it('adds with the entered number as a number', async () => {
      const { user, onAddBuiltin } = await toStep();
      const input = screen.getByLabelText('Days ahead');
      await user.clear(input);
      await user.type(input, '30');
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      expect(onAddBuiltin).toHaveBeenCalledWith(upcoming, { days: 30 });
    });

    it('uses the default when unchanged', async () => {
      const { user, onAddBuiltin } = await toStep();
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      expect(onAddBuiltin).toHaveBeenCalledWith(upcoming, { days: 14 });
    });

    it('rejects below min, above max and non-integers, disabling Add', async () => {
      const { user, onAddBuiltin } = await toStep();
      const input = screen.getByLabelText('Days ahead');
      const add = screen.getByRole('button', { name: 'Add widget' });
      await user.clear(input);
      await user.type(input, '0');
      expect(screen.getByText('At least 1')).toBeInTheDocument();
      expect(add).toBeDisabled();
      await user.clear(input);
      await user.type(input, '91');
      expect(screen.getByText('At most 90')).toBeInTheDocument();
      expect(add).toBeDisabled();
      await user.clear(input);
      await user.type(input, '2.5');
      expect(screen.getByText('Enter a whole number')).toBeInTheDocument();
      expect(add).toBeDisabled();
      expect(onAddBuiltin).not.toHaveBeenCalled();
    });

    it('accepts the bounds themselves', async () => {
      const { user, onAddBuiltin } = await toStep();
      const input = screen.getByLabelText('Days ahead');
      await user.clear(input);
      await user.type(input, '90');
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      expect(onAddBuiltin).toHaveBeenCalledWith(upcoming, { days: 90 });
    });

    it('a blank optional int is omitted from params', async () => {
      const { user, onAddBuiltin } = await toStep();
      const input = screen.getByLabelText('Days ahead');
      await user.clear(input);
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      expect(onAddBuiltin).toHaveBeenCalledWith(upcoming, {});
    });

    it('Back returns to the list', async () => {
      const { user } = await toStep();
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(await screen.findByText('Add a widget')).toBeInTheDocument();
    });

    it('can add the same built-in twice', async () => {
      const { user, onAddBuiltin } = await open();
      await user.click(await screen.findByText('Net worth'));
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      await user.click(await screen.findByText('Net worth'));
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      expect(onAddBuiltin).toHaveBeenCalledTimes(2);
    });
  });

  describe('card param step', () => {
    async function toStep() {
      const ctx = await open();
      await ctx.user.click(await screen.findByText('Bills due'));
      return ctx;
    }

    it('offers All cards plus only open credit cards', async () => {
      await toStep();
      const select = await screen.findByTestId('select');
      expect(select).toHaveAttribute('data-value', '__all__');
      await waitFor(() => expect(within(select).getByText('HDFC Card')).toBeInTheDocument());
      expect(within(select).getByText('All cards')).toBeInTheDocument();
      expect(within(select).queryByText('Old Card')).not.toBeInTheDocument();
      expect(within(select).queryByText('Savings')).not.toBeInTheDocument();
    });

    it('All cards omits accountId', async () => {
      const { user, onAddBuiltin } = await toStep();
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      expect(onAddBuiltin).toHaveBeenCalledWith(bills, {});
    });

    it('a chosen card sets accountId', async () => {
      const { user, onAddBuiltin } = await toStep();
      await user.click(await screen.findByRole('option', { name: 'HDFC Card' }));
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      expect(onAddBuiltin).toHaveBeenCalledWith(bills, { accountId: 'c1' });
    });

    it('explains when there are no open cards', async () => {
      vi.mocked(api.GET).mockImplementation(((url: string) =>
        Promise.resolve({ data: url === '/api/v1/dashboards/builtins' ? [bills] : [] })) as never);
      const { user } = await open();
      await user.click(await screen.findByText('Bills due'));
      expect(await screen.findByText(/No open credit cards/)).toBeInTheDocument();
    });
  });
});
