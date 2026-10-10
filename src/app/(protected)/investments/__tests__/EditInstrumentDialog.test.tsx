import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  };
});
vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);
vi.mock('@/app/(protected)/investments/InstrumentSearchField', () => ({ InstrumentSearchField: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { toast } from 'sonner';

import { EditInstrumentDialog } from '@/app/(protected)/investments/EditInstrumentDialog';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { Instrument } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

const inst: Instrument = {
  id: 'inst-1',
  type: 'stock',
  name: 'Acme Ltd',
  symbol: 'ACME',
  exchange: 'NSE',
  isin: 'INE000A01011',
  yahooSymbol: 'ACME.NS',
  currency: 'INR',
  assetClass: 'EQUITY',
  assetClassSource: 'RULE',
  overridden: false,
  overriddenFields: [],
};

function open(props: Partial<React.ComponentProps<typeof EditInstrumentDialog>> = {}) {
  const utils = renderWithQuery(
    <EditInstrumentDialog instrument={inst} trigger={<button type="button">Edit</button>} {...props} />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  return utils;
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

function assetClassSelect() {
  return screen.getByRole('combobox', { name: 'Asset class' }).closest('[data-testid="select"]') as HTMLElement;
}

describe('EditInstrumentDialog — per-account edits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.PUT).mockResolvedValue({ data: { ...inst, name: 'Acme Renamed' } } as never);
    vi.mocked(api.PATCH).mockResolvedValue({ data: { ...inst, assetClass: 'GOLD' } } as never);
  });

  it('says edits apply to this account only and how identifier changes move holdings', () => {
    open();
    expect(screen.getByText(/Edits apply to your account only/)).toBeInTheDocument();
    expect(screen.getByText(/moves your\s+holdings, trades and prices/)).toBeInTheDocument();
  });

  it('caps every text input at the server limit', () => {
    open();
    const limits: Record<string, number> = {
      'Instrument Name': 255,
      'Symbol / Ticker': 50,
      Exchange: 20,
      Currency: 10,
      'ISIN (Optional)': 50,
      'AMFI Code (For Mutual Funds)': 50,
      'Yahoo Symbol (For Stocks/ETFs)': 50,
    };
    for (const [label, max] of Object.entries(limits)) {
      expect(screen.getByLabelText(label)).toHaveAttribute('maxLength', String(max));
    }
  });

  it('PUTs the trimmed fields and sends no PATCH when the asset class is unchanged', async () => {
    const onUpdated = vi.fn();
    open({ onUpdated });
    fireEvent.change(screen.getByLabelText('Instrument Name'), { target: { value: '  Acme Renamed ' } });
    save();

    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/instruments/{id}', {
      params: { path: { id: 'inst-1' } },
      body: {
        type: 'stock',
        name: 'Acme Renamed',
        symbol: 'ACME',
        exchange: 'NSE',
        isin: 'INE000A01011',
        amfiCode: undefined,
        yahooSymbol: 'ACME.NS',
        currency: 'INR',
      },
    });
    expect(api.PATCH).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Updated Acme Renamed for your account');
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ id: 'inst-1' }), 'inst-1');
  });

  it('shows Auto (catalog) when the class is not pinned and pins a chosen class via PATCH', async () => {
    open();
    expect(assetClassSelect()).toHaveAttribute('data-value', 'AUTO');
    fireEvent.click(within(assetClassSelect()).getByRole('option', { name: 'Gold' }));
    save();

    await waitFor(() => expect(api.PATCH).toHaveBeenCalled());
    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/instruments/{id}', {
      params: { path: { id: 'inst-1' } },
      body: { assetClass: 'GOLD' },
    });
  });

  it('starts on the pinned class and sends null when switched back to Auto', async () => {
    open({ instrument: { ...inst, assetClass: 'DEBT', assetClassSource: 'MANUAL', overridden: true, overriddenFields: ['assetClass'] } });
    expect(assetClassSelect()).toHaveAttribute('data-value', 'DEBT');
    fireEvent.click(within(assetClassSelect()).getByRole('option', { name: 'Auto (catalog)' }));
    save();

    await waitFor(() => expect(api.PATCH).toHaveBeenCalled());
    expect(vi.mocked(api.PATCH).mock.calls[0][1]).toMatchObject({ body: { assetClass: null } });
  });

  it('follows an identifier edit to the new instrument: PATCH on the new id, onUpdated(new, oldId)', async () => {
    const moved = { ...inst, id: 'inst-2', name: 'Acme Other', isin: 'INE999Z01019' };
    vi.mocked(api.PUT).mockResolvedValue({ data: moved } as never);
    vi.mocked(api.PATCH).mockResolvedValue({ data: { ...moved, assetClass: 'HYBRID' } } as never);
    const onUpdated = vi.fn();
    open({ onUpdated });
    fireEvent.change(screen.getByLabelText('ISIN (Optional)'), { target: { value: 'INE999Z01019' } });
    fireEvent.click(within(assetClassSelect()).getByRole('option', { name: 'Hybrid' }));
    save();

    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
    expect(vi.mocked(api.PATCH).mock.calls[0][1]).toMatchObject({ params: { path: { id: 'inst-2' } } });
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ id: 'inst-2' }), 'inst-1');
    expect(toast.success).toHaveBeenCalledWith('Moved your holdings to Acme Other');
  });

  it('invalidates investment queries and widget data after a save', async () => {
    const { queryClient } = open();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    save();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: keys.investments.all }));
    expect(spy).toHaveBeenCalledWith({ queryKey: [...keys.dashboards.all, 'widget'] });
  });

  it('still invalidates when the PATCH fails after the PUT saved', async () => {
    vi.mocked(api.PATCH).mockRejectedValue(new ApiError(500, { code: 'INTERNAL', message: 'boom' }));
    const { queryClient } = open();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    fireEvent.click(within(assetClassSelect()).getByRole('option', { name: 'Debt' }));
    save();
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: keys.investments.all }));
    expect(toast.error).toHaveBeenCalledWith('boom', expect.anything());
  });

  it('shows the repoint 400 inline and keeps the dialog open', async () => {
    const msg = 'Acme Ltd is a shared catalog instrument (ISIN INE000A01011); its price feed can\'t be changed for one account.';
    vi.mocked(api.PUT).mockRejectedValue(new ApiError(400, { code: 'VALIDATION_ERROR', message: msg }));
    open();
    fireEvent.change(screen.getByLabelText('Yahoo Symbol (For Stocks/ETFs)'), { target: { value: 'ACME.BO' } });
    save();

    expect(await screen.findByRole('alert')).toHaveTextContent(msg);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows field-level validation 400s under their inputs', async () => {
    vi.mocked(api.PUT).mockRejectedValue(
      new ApiError(400, {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { symbol: 'Symbol is at most 50 characters' },
      })
    );
    open();
    save();
    expect(await screen.findByText('Symbol is at most 50 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Symbol / Ticker')).toHaveAttribute('aria-invalid', 'true');
  });

  it('toasts non-400 failures instead of showing them inline', async () => {
    vi.mocked(api.PUT).mockRejectedValue(new ApiError(503, { code: 'UNAVAILABLE', message: 'Try again later' }));
    open();
    save();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Try again later', expect.anything()));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('requires a name inline without calling the server', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Instrument Name'), { target: { value: '   ' } });
    save();
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('clears a previous error when reopened', async () => {
    vi.mocked(api.PUT).mockRejectedValue(new ApiError(400, { code: 'VALIDATION_ERROR', message: 'Nope' }));
    open();
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Nope');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('saves an edit that changes only the Yahoo symbol (the other identifiers stay as they were)', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Yahoo Symbol (For Stocks/ETFs)'), { target: { value: 'ACME.BO' } });
    save();
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(vi.mocked(api.PUT).mock.calls[0][1]).toMatchObject({
      body: { isin: 'INE000A01011', yahooSymbol: 'ACME.BO' },
    });
  });

  it('blocks clearing an identifier without a new one, inline under that field, without calling the server', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Yahoo Symbol (For Stocks/ETFs)'), { target: { value: '' } });
    save();
    expect(await screen.findByText(/Yahoo symbol can't be cleared for your account alone/)).toBeInTheDocument();
    expect(screen.getByLabelText('Yahoo Symbol (For Stocks/ETFs)')).toHaveAttribute('aria-invalid', 'true');
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('allows clearing one identifier when another gets a new value', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Yahoo Symbol (For Stocks/ETFs)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('ISIN (Optional)'), { target: { value: 'INE999Z01019' } });
    save();
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
  });

  it('shows the corporate-action refusal (400) inline and keeps the dialog open', async () => {
    const msg =
      "Can't switch the price feed of Acme Ltd for one account: Acme Ltd is part of a corporate action (split of Acme Ltd 1:2). Enter a manual price instead.";
    vi.mocked(api.PUT).mockRejectedValue(new ApiError(400, { code: 'VALIDATION_ERROR', message: msg }));
    open();
    fireEvent.change(screen.getByLabelText('ISIN (Optional)'), { target: { value: 'INE999Z01019' } });
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent(msg);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('says the holding was merged into the existing one, with the merge note as the toast description', async () => {
    const note = 'Both holdings had sells. Their trades are now one history, so realised gains may differ.';
    vi.mocked(api.PUT).mockResolvedValue({
      data: { ...inst, id: 'inst-2', name: 'Acme Other', isin: 'INE999Z01019', mergedHoldings: true, mergeNote: note },
    } as never);
    open();
    fireEvent.change(screen.getByLabelText('ISIN (Optional)'), { target: { value: 'INE999Z01019' } });
    save();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Merged your holding into your existing Acme Other holding', {
        description: note,
      })
    );
  });

  it('reports a merge without a note (no sells on both sides) with no description', async () => {
    vi.mocked(api.PUT).mockResolvedValue({
      data: { ...inst, id: 'inst-2', name: 'Acme Other', mergedHoldings: true, mergeNote: null },
    } as never);
    open();
    fireEvent.change(screen.getByLabelText('ISIN (Optional)'), { target: { value: 'INE999Z01019' } });
    save();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Merged your holding into your existing Acme Other holding', {
        description: undefined,
      })
    );
  });

  it('keeps the PUT merge outcome when a PATCH (asset class) follows', async () => {
    vi.mocked(api.PUT).mockResolvedValue({
      data: { ...inst, id: 'inst-2', name: 'Acme Other', mergedHoldings: true, mergeNote: 'note' },
    } as never);
    vi.mocked(api.PATCH).mockResolvedValue({ data: { ...inst, id: 'inst-2', name: 'Acme Other', mergedHoldings: false } } as never);
    open();
    fireEvent.change(screen.getByLabelText('ISIN (Optional)'), { target: { value: 'INE999Z01019' } });
    fireEvent.click(within(assetClassSelect()).getByRole('option', { name: 'Debt' }));
    save();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Merged your holding into your existing Acme Other holding', {
        description: 'note',
      })
    );
  });
});
