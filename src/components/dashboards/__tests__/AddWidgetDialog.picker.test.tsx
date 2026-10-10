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

const b = (over: Partial<BuiltinWidgetResponse> & { key: string; category: string }): BuiltinWidgetResponse => ({
  label: over.key,
  description: `${over.key} description`,
  kind: 'component',
  minW: 50,
  params: [],
  ...over,
});

const netWorth = b({ key: 'net_worth', category: 'overview', label: 'Net worth', description: 'Everything you own minus everything you owe.' });
const utilisation = b({
  key: 'card_utilisation',
  category: 'cards_rewards',
  label: 'Card utilisation',
  description: 'How much of each limit you use.',
  requires: 'Needs a credit card.',
  unavailableReason: 'Add a credit card first',
});
const milestones = b({ key: 'milestone_progress', category: 'cards_rewards', label: 'Milestones', description: 'Spend milestones per card.' });
const heatmap = b({
  key: 'spend_heatmap',
  category: 'spending',
  label: 'Spend heatmap',
  description: 'Daily spending as a calendar.',
  requires: 'Needs some spending to show.',
  params: [{ name: 'months', type: 'int', required: false, min: 1, max: 12, defaultValue: 6 }],
});
const accountTile = b({
  key: 'account_tile',
  category: 'overview',
  label: 'Account tile',
  description: 'One account with a trend.',
  minW: 25,
  params: [{ name: 'accountId', type: 'uuid', ref: 'account', required: true }],
});
const future = b({ key: 'brand_new', category: 'mystery', label: 'Brand new', description: 'A widget the client has never heard of.' });

const reports = [
  { id: 'r1', name: 'Spend this month', type: 'CHART' },
  { id: 'r2', name: 'Fuel by card', type: 'TABLE' },
] as ReportSummaryResponse[];

const accounts = [{ id: 'b1', name: 'Savings', type: 'bank_account', closedOn: null }];

function seed(builtins: BuiltinWidgetResponse[] = [netWorth, utilisation, milestones, heatmap, accountTile, future]) {
  vi.mocked(api.GET).mockImplementation(((url: string) => {
    if (url === '/api/v1/dashboards/builtins') return Promise.resolve({ data: builtins });
    if (url === '/api/v1/accounts') return Promise.resolve({ data: accounts });
    return Promise.resolve({ data: [] });
  }) as never);
}

async function open(onAddBuiltin = vi.fn(), onAdd = vi.fn()) {
  const user = userEvent.setup();
  renderWithQuery(<AddWidgetDialog reports={reports} onAdd={onAdd} onAddBuiltin={onAddBuiltin} />);
  await user.click(screen.getByRole('button', { name: 'Add widget' }));
  await screen.findByText('Net worth');
  return { user, onAddBuiltin, onAdd };
}

const nav = () => screen.getByRole('navigation', { name: 'Widget categories' });
const builtinsCalls = () => (vi.mocked(api.GET).mock.calls as unknown[][]).filter(([url]) => url === '/api/v1/dashboards/builtins').length;

describe('AddWidgetDialog picker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    seed();
  });

  describe('categories', () => {
    it('offers All, the built-in categories that have entries, and Your reports; All is selected', async () => {
      await open();
      const chips = within(nav()).getAllByRole('button');
      expect(chips.map((c) => c.textContent)).toEqual(['All', 'Overview', 'Cards & rewards', 'Spending', 'Your reports']);
      expect(within(nav()).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('a category shows only its built-ins and no reports', async () => {
      const { user } = await open();
      await user.click(within(nav()).getByRole('button', { name: 'Cards & rewards' }));
      expect(within(nav()).getByRole('button', { name: 'Cards & rewards' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Card utilisation')).toBeInTheDocument();
      expect(screen.getByText('Milestones')).toBeInTheDocument();
      expect(screen.queryByText('Net worth')).not.toBeInTheDocument();
      expect(screen.queryByText('Spend this month')).not.toBeInTheDocument();
    });

    it('All shows every built-in, an unknown category included, and the reports', async () => {
      await open();
      expect(screen.getByText('Brand new')).toBeInTheDocument();
      expect(screen.getByText('Spend heatmap')).toBeInTheDocument();
      expect(screen.getByText('Fuel by card')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Your reports' })).toBeInTheDocument();
    });

    it('Your reports lists the reports with their type, no New report link, and no built-ins', async () => {
      const { user, onAdd } = await open();
      await user.click(within(nav()).getByRole('button', { name: 'Your reports' }));
      expect(screen.queryByText('Net worth')).not.toBeInTheDocument();
      expect(screen.getByText('CHART')).toBeInTheDocument();
      expect(screen.getByText('TABLE')).toBeInTheDocument();
      // No always-visible link out of the editor (it would drop unsaved edits).
      expect(screen.queryByRole('link', { name: 'New report' })).not.toBeInTheDocument();
      await user.click(screen.getByText('Fuel by card'));
      expect(onAdd).toHaveBeenCalledWith(reports[1]);
    });
  });

  describe('search', () => {
    it('matches label and description, case-insensitively, within the category', async () => {
      const { user } = await open();
      const search = screen.getByRole('searchbox', { name: 'Search widgets' });
      await user.type(search, 'CALENDAR');
      expect(screen.getByText('Spend heatmap')).toBeInTheDocument();
      expect(screen.queryByText('Net worth')).not.toBeInTheDocument();
      await user.clear(search);
      await user.type(search, 'net');
      expect(screen.getByText('Net worth')).toBeInTheDocument();
      expect(screen.queryByText('Spend heatmap')).not.toBeInTheDocument();
    });

    it('filters reports by name and says when nothing matches', async () => {
      const { user } = await open();
      await user.type(screen.getByRole('searchbox', { name: 'Search widgets' }), 'fuel');
      expect(screen.getByText('Fuel by card')).toBeInTheDocument();
      expect(screen.queryByText('Spend this month')).not.toBeInTheDocument();
      expect(screen.getByText('No widgets match.')).toBeInTheDocument();
      await user.type(screen.getByRole('searchbox', { name: 'Search widgets' }), 'zzz');
      expect(screen.getByText('No reports match.')).toBeInTheDocument();
    });

    it('closing resets the search and category', async () => {
      const { user } = await open();
      await user.click(within(nav()).getByRole('button', { name: 'Spending' }));
      await user.type(screen.getByRole('searchbox', { name: 'Search widgets' }), 'heat');
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByText('Add a widget')).not.toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      expect(await screen.findByRole('searchbox', { name: 'Search widgets' })).toHaveValue('');
      expect(within(nav()).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('cards', () => {
    it('show the registry icon (generic for an unknown key), label and full description, no badges', async () => {
      await open();
      const card = screen.getByTestId('builtin-card-milestone_progress');
      expect(within(card).getByText('Spend milestones per card.')).toBeInTheDocument();
      expect(card.querySelector('svg.lucide-trophy')).not.toBeNull();
      expect(screen.getByTestId('builtin-card-brand_new').querySelector('svg.lucide-layout-grid')).not.toBeNull();
      expect(within(card).queryByText(/Half|Added|Built-in/)).not.toBeInTheDocument();
    });

    it('an unavailable built-in is dimmed, shows the reason and cannot be picked', async () => {
      const { user, onAddBuiltin } = await open();
      const card = screen.getByTestId('builtin-card-card_utilisation');
      expect(card).toBeDisabled();
      expect(card.className).toContain('disabled:opacity-60');
      expect(within(card).getByText('Add a credit card first')).toBeInTheDocument();
      await user.click(card);
      expect(screen.getByText('Add a widget')).toBeInTheDocument();
      expect(onAddBuiltin).not.toHaveBeenCalled();
    });

    it('re-checks availability each time the picker opens', async () => {
      const { user } = await open();
      expect(builtinsCalls()).toBe(1);
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByText('Add a widget')).not.toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      await waitFor(() => expect(builtinsCalls()).toBe(2));
    });
  });

  describe('details step', () => {
    it('shows the description, the requires line, the captioned preview and the settings', async () => {
      const { user, onAddBuiltin } = await open();
      await user.click(screen.getByText('Spend heatmap'));
      expect(screen.getByRole('heading', { name: 'Spend heatmap' })).toBeInTheDocument();
      expect(screen.getByText('Daily spending as a calendar.')).toBeInTheDocument();
      expect(screen.getByText('Needs some spending to show.')).toBeInTheDocument();
      const frame = screen.getByTestId('widget-preview-frame');
      const caption = screen.getByText('Preview · sample data');
      expect(frame).not.toContainElement(caption);
      expect(caption.compareDocumentPosition(frame) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(within(frame).getByText('Darker days spent more')).toBeInTheDocument();
      expect(screen.getByLabelText('Months')).toHaveValue(6);
      await user.click(screen.getByRole('button', { name: 'Add widget' }));
      expect(onAddBuiltin).toHaveBeenCalledWith(heatmap, { months: 6 });
    });

    it('an unknown key gets the generic preview', async () => {
      const { user } = await open();
      await user.click(screen.getByText('Brand new'));
      expect(within(screen.getByTestId('widget-preview-frame')).getByTestId('generic-preview')).toBeInTheDocument();
    });

    it('a required param blocks Add widget until set', async () => {
      const { user, onAddBuiltin } = await open();
      await user.click(screen.getByText('Account tile'));
      const add = screen.getByRole('button', { name: 'Add widget' });
      expect(add).toBeDisabled();
      await user.click(await screen.findByRole('option', { name: 'Savings' }));
      expect(add).toBeEnabled();
      await user.click(add);
      expect(onAddBuiltin).toHaveBeenCalledWith(accountTile, { accountId: 'b1' });
    });

    it('Back returns to the list in the same category', async () => {
      const { user } = await open();
      await user.click(within(nav()).getByRole('button', { name: 'Spending' }));
      await user.click(screen.getByText('Spend heatmap'));
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByText('Add a widget')).toBeInTheDocument();
      expect(within(nav()).getByRole('button', { name: 'Spending' })).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
