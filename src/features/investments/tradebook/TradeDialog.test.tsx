import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { RecordTradeDialog } from './TradeDialog';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/investments', useSearchParams: () => new URLSearchParams() }));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const accounts = vi.hoisted(() => ({ list: [] as unknown[], loading: false }));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: accounts.list, isLoading: accounts.loading }) }));

const catalog = vi.hoisted(() => ({
  results: [] as unknown[],
  query: '',
  resolve: vi.fn(),
}));
vi.mock('../instruments/useCatalogSearch', async () => {
  const React = await import('react');
  return {
  useCatalogSearch: (query: string) => {
    catalog.query = query;
    return { results: query.trim().length >= 2 ? catalog.results : [], isLoading: false, hasQuery: query.trim().length >= 2 };
  },
  useResolveInstrumentMutation: () => {
    const [isPending, setPending] = React.useState(false);
    const mutateAsync = async (...args: unknown[]) => {
      setPending(true);
      try {
        return await catalog.resolve(...args);
      } finally {
        setPending(false);
      }
    };
    return { mutateAsync, isPending };
  },
  };
});

// The add-instrument dialog is tested on its own: here it only hands back the instrument it made.
vi.mock('../instruments/InstrumentAddDialog', () => ({
  InstrumentAddDialog: ({ initialMode, onCreated, onClose }: { initialMode?: string; onCreated?: (i: unknown) => void; onClose: () => void }) => (
    <div data-testid="add-instrument">
      {initialMode}
      <button
        onClick={() => {
          onCreated?.({ id: 'i-new', type: 'stock', name: 'Unlisted Co', symbol: 'UNL', currency: 'INR' });
          onClose();
        }}
      >
        make instrument
      </button>
    </div>
  ),
}));

const api = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn(), GET: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

const infy = { id: 'i-infy', type: 'stock', name: 'Infosys', symbol: 'INFY', currency: 'INR' };
const zerodha = { id: 'b-z', type: 'broker', name: 'Zerodha', provider: 'Zerodha', clientId: 'ZQ4471' };
const groww = { id: 'b-g', type: 'broker', name: 'Groww', provider: 'Groww' };
const closed = { id: 'b-c', type: 'broker', name: 'Old broker', provider: 'Upstox', closedOn: '2020-01-01' };

const user = userEvent.setup({ pointerEventsCheck: 0 });
const onClose = vi.fn();
const onSaved = vi.fn();

function open(props: Partial<React.ComponentProps<typeof RecordTradeDialog>> = {}) {
  return renderWithQuery(<RecordTradeDialog onClose={onClose} onSaved={onSaved} {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  accounts.list = [zerodha, groww, closed, { id: 'a-1', type: 'bank_account', name: 'HDFC' }];
  accounts.loading = false;
  catalog.results = [
    { source: 'LOCAL', type: 'stock', name: 'Infosys', symbol: 'INFY', exchange: 'NSE', existingInstrumentId: 'i-infy' },
    { source: 'YAHOO', type: 'stock', name: 'Infosys Ltd ADR', symbol: 'INFY.US', yahooSymbol: 'INFY' },
  ];
  catalog.resolve.mockResolvedValue(infy);
  api.POST.mockResolvedValue({ data: {} });
});

/** Opens the instrument dropdown, types a search and picks the named option. */
async function pickInstrument(name: RegExp | string = /INFY · Infosys/) {
  await user.click(screen.getByRole('combobox', { name: /Instrument/ }));
  await user.type(await screen.findByPlaceholderText('Search by name or symbol'), 'infy');
  await user.click(await screen.findByRole('option', { name }));
}

describe('Record trade', () => {
  it('opens as a Buy on the first open broker, dated today', async () => {
    open();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Record trade')).toBeTruthy();
    expect(within(dialog).getByText('Zerodha · prices in ₹')).toBeTruthy();
    expect(within(dialog).getByRole('radio', { name: 'Buy' }).getAttribute('aria-checked')).toBe('true');
    expect(within(dialog).getByRole('combobox', { name: /Broker/ }).textContent).toContain('Zerodha · ZQ4471');
    expect((within(dialog).getByLabelText('Date') as HTMLInputElement).value).toBe('13/10/2026');
    expect(within(dialog).getByRole('button', { name: 'Record buy' })).toBeTruthy();
    expect(within(dialog).getByText('Type to search your catalog, AMFI or Yahoo.')).toBeTruthy();
  });

  it('lists only open brokers, and a closed one the caller asks for', async () => {
    open();
    await user.click(await screen.findByRole('combobox', { name: /Broker/ }));
    expect(await screen.findByRole('option', { name: /Groww/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Old broker/ })).toBeNull();
  });

  it('starts on the broker it is given', async () => {
    open({ initialBrokerAccountId: 'b-g' });
    expect((await screen.findByRole('combobox', { name: /Broker/ })).textContent).toContain('Groww');
    expect(screen.getByText('Groww · prices in ₹')).toBeTruthy();
  });

  it('starts with the instrument it is given', async () => {
    open({ initialInstrument: infy as never });
    expect((await screen.findByRole('combobox', { name: /Instrument/ })).textContent).toContain('INFY · Infosys');
  });

  it('works out value, charges and the total as you type, and flips to Net on a sell', async () => {
    open();
    fireEvent.change(await screen.findByLabelText('Qty'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '1512.70' } });
    expect(screen.getByText('Value ₹30,254 · charges ₹0')).toBeTruthy();
    expect(screen.getByText('Total ₹30,254')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Itemise charges/ }));
    fireEvent.change(screen.getByLabelText('STT'), { target: { value: '30.25' } });
    fireEvent.change(screen.getByLabelText('GST'), { target: { value: '7.75' } });
    expect(screen.getByText('Value ₹30,254 · charges ₹38')).toBeTruthy();
    expect(screen.getByText('Total ₹30,292')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Sell' }));
    expect(screen.getByText('Net ₹30,216')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record sell' })).toBeTruthy();
  });

  it('folds the charges under a link until it is pressed', async () => {
    open();
    await screen.findByRole('dialog');
    expect(screen.queryByLabelText('Brokerage')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Itemise charges · brokerage, STT, exchange, GST, stamp duty' }));
    for (const label of ['Brokerage', 'STT', 'Exchange txn charges', 'SEBI charges', 'Stamp duty', 'GST', 'DP charges', 'Other']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: /Itemise charges/ })).toBeNull();
  });

  it('keeps only digits and one point in the numbers', async () => {
    open();
    fireEvent.change(await screen.findByLabelText('Qty'), { target: { value: '1a2.5.5' } });
    expect((screen.getByLabelText('Qty') as HTMLInputElement).value).toBe('12.55');
  });

  it('asks for the instrument, quantity and price before it sends anything', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Record buy' }));
    expect(await screen.findByText('Choose an instrument')).toBeTruthy();
    expect(screen.getByText('Quantity must be above zero')).toBeTruthy();
    expect(screen.getByText('Enter the price per unit')).toBeTruthy();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('records the trade: every charge, the notes, then refreshes and closes', async () => {
    open();
    await pickInstrument();
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '1512.70' } });
    fireEvent.change(screen.getByLabelText(/Notes/), { target: { value: 'Manual buy' } });
    fireEvent.click(screen.getByRole('button', { name: /Itemise charges/ }));
    fireEvent.change(screen.getByLabelText('STT'), { target: { value: '30.25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record buy' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/investments/transactions', {
      body: {
        brokerAccountId: 'b-z',
        instrumentId: 'i-infy',
        type: 'buy',
        quantity: 20,
        price: 1512.7,
        tradeDate: '2026-10-13',
        charges: { brokerage: 0, stt: 30.25, exchangeTxnCharges: 0, sebiCharges: 0, stampDuty: 0, gst: 0, dpCharges: 0, otherCharges: 0 },
        notes: 'Manual buy',
      },
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(router.refresh).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Recorded buy for INFY', { tone: 'success' });
  });

  it('records a sell on the chosen broker', async () => {
    open();
    await pickInstrument();
    fireEvent.click(screen.getByRole('radio', { name: 'Sell' }));
    await user.click(screen.getByRole('combobox', { name: /Broker/ }));
    await user.click(await screen.findByRole('option', { name: /Groww/ }));
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record sell' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(api.POST.mock.calls[0][1].body).toMatchObject({ brokerAccountId: 'b-g', type: 'sell', quantity: 5, price: 0, notes: undefined });
  });

  it('shows the failure and keeps the form', async () => {
    api.POST.mockRejectedValue(new Error('nope'));
    open();
    await pickInstrument();
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record buy' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Failed to record the trade', { tone: 'danger' }));
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Qty') as HTMLInputElement).value).toBe('1');
  });

  it('ignores Escape while the trade is being saved, and closes on it otherwise', async () => {
    let finish: (v: unknown) => void = () => undefined;
    api.POST.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    open();
    await pickInstrument();
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record buy' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    finish({ data: {} });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('closes after a successful save', async () => {
    open();
    await pickInstrument();
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record buy' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows the picked instrument only once it is resolved, and does not save before that', async () => {
    let resolved: (v: unknown) => void = () => undefined;
    catalog.resolve.mockReturnValue(new Promise((resolve) => (resolved = resolve)));
    open();
    await pickInstrument();
    const field = screen.getByRole('combobox', { name: /Instrument/ });
    await waitFor(() => expect(field.textContent).toContain('Adding'));
    expect(field.textContent).not.toContain('Infosys');
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '10' } });
    const record = screen.getByRole('button', { name: 'Record buy' });
    expect((record as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(record.closest('form') ?? screen.getByLabelText('Qty').closest('form')!);
    expect(api.POST).not.toHaveBeenCalled();
    expect(screen.queryByText('Choose an instrument')).toBeNull();
    resolved(infy);
    await waitFor(() => expect(screen.getByRole('combobox', { name: /Instrument/ }).textContent).toContain('Infosys'));
    expect((screen.getByRole('button', { name: 'Record buy' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('closes on Escape when nothing is being saved', async () => {
    open();
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancel closes without sending', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('sends you to Accounts when there is no broker account', async () => {
    accounts.list = [{ id: 'a-1', type: 'bank_account', name: 'HDFC' }];
    open();
    expect(await screen.findByText('You need at least one broker account to record trades.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add a broker account' }).getAttribute('href')).toBe('/accounts');
    expect(screen.queryByLabelText('Qty')).toBeNull();
  });
});

describe('the instrument field', () => {
  it('groups your catalog before the search feeds and resolves the pick on the server', async () => {
    open();
    await user.click(await screen.findByRole('combobox', { name: /Instrument/ }));
    await user.type(await screen.findByPlaceholderText('Search by name or symbol'), 'infy');
    expect(await screen.findByText('In your catalog')).toBeTruthy();
    expect(screen.getByText('Search results')).toBeTruthy();
    await user.click(screen.getByRole('option', { name: /^INFY · Infosys/ }));
    await waitFor(() => expect(catalog.resolve).toHaveBeenCalled());
    expect(catalog.resolve).toHaveBeenCalledWith(expect.objectContaining({ type: 'stock', name: 'Infosys', existingInstrumentId: 'i-infy' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: /Instrument/ }).textContent).toContain('INFY · Infosys'));
  });

  it('asks for two characters before it searches', async () => {
    open();
    await user.click(await screen.findByRole('combobox', { name: /Instrument/ }));
    await user.type(await screen.findByPlaceholderText('Search by name or symbol'), 'i');
    expect(await screen.findByText('Type at least 2 characters to search.')).toBeTruthy();
  });

  it('says so when nothing matches', async () => {
    catalog.results = [];
    open();
    await user.click(await screen.findByRole('combobox', { name: /Instrument/ }));
    await user.type(await screen.findByPlaceholderText('Search by name or symbol'), 'zzzz');
    expect(await screen.findByText('No instruments found.')).toBeTruthy();
  });

  it('offers "Enter it manually", which opens the manual add form and selects what it creates', async () => {
    open();
    await user.click(await screen.findByRole('combobox', { name: /Instrument/ }));
    expect(screen.queryByTestId('add-instrument')).toBeNull();
    await user.click(await screen.findByText('Enter it manually'));
    expect(screen.getByTestId('add-instrument')).toHaveTextContent('manual');
    await user.click(screen.getByText('make instrument'));
    await waitFor(() => expect(screen.queryByTestId('add-instrument')).toBeNull());
    expect(screen.getByRole('combobox', { name: /Instrument/ }).textContent).toContain('UNL · Unlisted Co');
  });

  it('shows the failure when the entry cannot be added', async () => {
    catalog.resolve.mockRejectedValue(new Error('bad'));
    open();
    await pickInstrument();
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Failed to add the instrument', { tone: 'danger' }));
    expect(screen.getByRole('combobox', { name: /Instrument/ }).textContent).not.toContain('INFY');
  });
});
