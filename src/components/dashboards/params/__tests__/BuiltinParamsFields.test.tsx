import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import type { BuiltinParamResponse, BuiltinWidgetResponse, WidgetParams } from '@/lib/dashboards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { BUILTIN_REGISTRY, type BuiltinParamsEditorProps } from '../../builtins/registry';
import { BuiltinParamsFields } from '../BuiltinParamsFields';
import { useParamsForm } from '../useParamsForm';

const def = (params: BuiltinParamResponse[], key = 'w'): BuiltinWidgetResponse => ({
  key,
  label: 'W',
  description: '',
  kind: 'component',
  minW: 50,
  category: 'overview',
  params,
});

const accounts = [
  { id: 'b1', name: 'Savings', type: 'bank_account', closedOn: null },
  { id: 'c1', name: 'HDFC Card', type: 'credit_card', closedOn: null },
  { id: 'c2', name: 'Old Card', type: 'credit_card', closedOn: '2020-01-01' },
  { id: 'k1', name: 'Zerodha', type: 'broker', closedOn: null },
  { id: 'g1', name: 'Cash', type: 'generic', closedOn: null },
];
const loans = [{ id: 'l1', name: 'Home loan', status: 'active' }];

/** Renders the fields and exposes the form's validity and built params. */
function Harness({ d, stored }: { d: BuiltinWidgetResponse; stored?: WidgetParams }) {
  const form = useParamsForm(d, stored);
  return (
    <>
      <BuiltinParamsFields form={form} />
      <output data-testid="valid">{String(form.valid)}</output>
      <output data-testid="params">{JSON.stringify(form.params())}</output>
    </>
  );
}

const params = () => JSON.parse(screen.getByTestId('params').textContent ?? '{}');
const valid = () => screen.getByTestId('valid').textContent === 'true';

const registry = BUILTIN_REGISTRY as Record<string, unknown>;

describe('BuiltinParamsFields', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockImplementation(((url: string) => {
      if (url === '/api/v1/accounts') return Promise.resolve({ data: accounts });
      if (url === '/api/v1/loans') return Promise.resolve({ data: { content: loans } });
      return Promise.resolve({ data: [] });
    }) as never);
  });
  afterEach(() => {
    delete registry.with_editor;
  });

  it('renders nothing (and fetches nothing) when no param gets a field', () => {
    renderWithQuery(<Harness d={def([{ name: 'note', type: 'string', required: false }])} />);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('select')).not.toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('int: a bounded number input, prefilled, with errors blocking', async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness d={def([{ name: 'n', type: 'int', required: false, min: 3, max: 10, defaultValue: 5 }])} />);
    const input = screen.getByLabelText('How many');
    expect(input).toHaveValue(5);
    expect(input).toHaveAttribute('min', '3');
    expect(input).toHaveAttribute('max', '10');
    expect(screen.getByText('Between 3 and 10.')).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, '11');
    expect(screen.getByText('At most 10')).toBeInTheDocument();
    expect(valid()).toBe(false);
    await user.clear(input);
    await user.type(input, '7');
    expect(params()).toEqual({ n: 7 });
  });

  it('credit_card (optional): All cards plus open cards only; All omits the param', async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness d={def([{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: false }])} />);
    const select = screen.getByTestId('select');
    await waitFor(() => expect(within(select).getByText('HDFC Card')).toBeInTheDocument());
    expect(select).toHaveAttribute('data-value', '__all__');
    expect(within(select).getByText('All cards')).toBeInTheDocument();
    expect(within(select).queryByText('Old Card')).not.toBeInTheDocument();
    expect(within(select).queryByText('Savings')).not.toBeInTheDocument();
    expect(params()).toEqual({});
    await user.click(screen.getByRole('option', { name: 'HDFC Card' }));
    expect(params()).toEqual({ accountId: 'c1' });
    await user.click(screen.getByRole('option', { name: 'All cards' }));
    expect(params()).toEqual({});
  });

  it('account (required): open accounts grouped by type, no All, Add blocked until picked', async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness d={def([{ name: 'accountId', type: 'uuid', ref: 'account', required: true }])} />);
    const select = screen.getByTestId('select');
    await waitFor(() => expect(within(select).getByText('Savings')).toBeInTheDocument());
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(within(select).queryByText('All accounts')).not.toBeInTheDocument();
    const groups = within(select).getAllByRole('group');
    expect(groups.map((g) => g.firstChild?.textContent)).toEqual(['Bank accounts', 'Credit cards', 'Brokers', 'Other accounts']);
    expect(within(groups[1]).getByText('HDFC Card')).toBeInTheDocument();
    expect(within(groups[1]).queryByText('Old Card')).not.toBeInTheDocument();
    expect(screen.getByText('Choose an account')).toBeInTheDocument();
    expect(valid()).toBe(false);
    await user.click(screen.getByRole('option', { name: 'Zerodha' }));
    expect(valid()).toBe(true);
    expect(params()).toEqual({ accountId: 'k1' });
  });

  it('account (optional) offers All accounts', async () => {
    renderWithQuery(<Harness d={def([{ name: 'accountId', type: 'uuid', ref: 'account', required: false }])} />);
    expect(await screen.findByRole('option', { name: 'All accounts' })).toBeInTheDocument();
  });

  it('loan: active loans fetched with status=active, All loans when optional', async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness d={def([{ name: 'loanId', type: 'uuid', ref: 'loan', required: false }])} />);
    await user.click(await screen.findByRole('option', { name: 'Home loan' }));
    expect(screen.getByRole('option', { name: 'All loans' })).toBeInTheDocument();
    expect(params()).toEqual({ loanId: 'l1' });
    expect(api.GET).toHaveBeenCalledWith('/api/v1/loans', { params: { query: { status: 'active', page: 0, size: 100 } } });
    expect(api.GET).not.toHaveBeenCalledWith('/api/v1/accounts');
  });

  it('explains an empty picker: optional falls back to all, required has nothing to choose', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: { content: [] } } as never);
    const { unmount } = renderWithQuery(<Harness d={def([{ name: 'loanId', type: 'uuid', ref: 'loan', required: false }])} />);
    expect(await screen.findByText('No active loans — the widget will show all loans.')).toBeInTheDocument();
    unmount();
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
    renderWithQuery(<Harness d={def([{ name: 'accountId', type: 'uuid', ref: 'account', required: true }])} />);
    expect(await screen.findByText('No open accounts to choose from.')).toBeInTheDocument();
  });

  it('prefills a picker from stored params (Widget settings)', async () => {
    renderWithQuery(
      <Harness d={def([{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: false }])} stored={{ accountId: 'c1' }} />,
    );
    expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'c1');
  });

  it('enum: options humanized, default preselected, required blocks until set', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithQuery(
      <Harness d={def([{ name: 'sortMode', type: 'enum', required: false, options: ['biggest_first', 'newest'], defaultValue: 'newest' }])} />,
    );
    expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'newest');
    await user.click(screen.getByRole('option', { name: 'Biggest first' }));
    expect(params()).toEqual({ sortMode: 'biggest_first' });
    unmount();
    renderWithQuery(<Harness d={def([{ name: 'sortMode', type: 'enum', required: true, options: ['a_b'] }])} />);
    expect(valid()).toBe(false);
    await user.click(screen.getByRole('option', { name: 'A b' }));
    expect(valid()).toBe(true);
  });

  it('string_list: nothing without a registry editor; the editor drives the list param when registered', async () => {
    const user = userEvent.setup();
    const list: BuiltinParamResponse = { name: 'items', type: 'string_list', required: true, defaultValue: ['page:/upcoming'] };
    const { unmount } = renderWithQuery(<Harness d={def([list], 'with_editor')} />);
    expect(screen.queryByTestId('list-editor')).not.toBeInTheDocument();
    expect(params()).toEqual({});
    unmount();

    registry.with_editor = {
      icon: () => null,
      ParamsEditor: ({ value, onChange }: BuiltinParamsEditorProps) => (
        <button type="button" data-testid="list-editor" onClick={() => onChange({ ...value, items: [] })}>
          {JSON.stringify(value.items)}
        </button>
      ),
    };
    renderWithQuery(<Harness d={def([list], 'with_editor')} />);
    expect(screen.getByTestId('list-editor')).toHaveTextContent('["page:/upcoming"]');
    expect(params()).toEqual({ items: ['page:/upcoming'] });
    expect(valid()).toBe(true);
    await user.click(screen.getByTestId('list-editor'));
    expect(valid()).toBe(false);
  });

  it('a required picker whose stored id is no longer offered shows it as "No longer available" and blocks saving until a valid pick', async () => {
    const user = userEvent.setup();
    // c2 is a closed card: not among the open accounts offered.
    renderWithQuery(<Harness d={def([{ name: 'accountId', type: 'uuid', ref: 'account', required: true }])} stored={{ accountId: 'c2' }} />);
    expect(await screen.findByRole('option', { name: 'No longer available' })).toBeInTheDocument();
    expect(screen.getByTestId('select')).toHaveAttribute('data-value', 'c2');
    expect(screen.getByText('This account is no longer available. Choose another to save.')).toBeInTheDocument();
    expect(valid()).toBe(false);
    await user.click(screen.getByRole('option', { name: 'Savings' }));
    expect(valid()).toBe(true);
    expect(params()).toEqual({ accountId: 'b1' });
    expect(screen.queryByRole('option', { name: 'No longer available' })).not.toBeInTheDocument();
  });

  it('an optional picker with a stale id does not block saving and offers a reset to All', async () => {
    const user = userEvent.setup();
    renderWithQuery(<Harness d={def([{ name: 'loanId', type: 'uuid', ref: 'loan', required: false }])} stored={{ loanId: 'paid-off' }} />);
    expect(await screen.findByText(/This loan is no longer available/)).toBeInTheDocument();
    expect(valid()).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Use All loans' }));
    expect(params()).toEqual({});
    expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();
  });

  it('a stored id is not judged while the options load or when they fail to load', async () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    const d = def([{ name: 'accountId', type: 'uuid', ref: 'credit_card', required: true }]);
    const { unmount } = renderWithQuery(<Harness d={d} stored={{ accountId: 'c1' }} />);
    expect(screen.queryByRole('option', { name: 'No longer available' })).not.toBeInTheDocument();
    expect(valid()).toBe(true);
    unmount();
    vi.mocked(api.GET).mockRejectedValue(new Error('down'));
    renderWithQuery(<Harness d={d} stored={{ accountId: 'c1' }} />);
    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(screen.queryByRole('option', { name: 'No longer available' })).not.toBeInTheDocument();
    expect(valid()).toBe(true);
  });
});
