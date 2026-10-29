import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CorporateActionDialog } from './CorporateActionDialog';
import { demerger, previewDemerger, split } from './corporateActions.fixtures';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ unstable_rethrow: () => undefined, useRouter: () => router }));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const preview = vi.hoisted(() => vi.fn());
vi.mock('./corporateActions', async (orig) => ({ ...(await orig<typeof import('./corporateActions')>()), loadCorporateActionPreview: preview }));

const api = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));

const catalog = vi.hoisted(() => ({ results: [] as unknown[], resolve: vi.fn() }));
vi.mock('../instruments/useCatalogSearch', () => ({
  useCatalogSearch: () => ({ results: catalog.results, isLoading: false, hasQuery: true }),
  useResolveInstrumentMutation: () => ({ mutateAsync: catalog.resolve, isPending: false }),
}));

const onClose = vi.fn();
const itc = { id: 'i-itc', name: 'ITC', symbol: 'ITC' };
const field = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const ok = (data: unknown) => ({ success: true as const, data });

beforeEach(() => {
  vi.clearAllMocks();
  catalog.results = [];
  preview.mockResolvedValue(ok({ holdings: [] }));
  api.POST.mockResolvedValue({ data: {} });
  api.PUT.mockResolvedValue({ data: {} });
  api.DELETE.mockResolvedValue({});
});

describe('CorporateActionDialog: recording', () => {
  it('opens on a 1 → 2 split dated today with the preselected instrument and no Delete', () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    expect(screen.getByText('Record corporate action')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Instrument/ })).toHaveTextContent('ITC');
    expect(screen.getByRole('combobox', { name: /^Action/ })).toHaveTextContent('Stock split');
    expect(screen.getByLabelText('Ex-date')).toHaveValue('13/10/2026');
    expect(field('Before')).toHaveValue('1');
    expect(field('After')).toHaveValue('2');
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Record split' })).toBeInTheDocument();
  });

  it('starts on the kind it is given and asks for the child instrument of a demerger', () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} type="demerger" onClose={onClose} />);
    expect(screen.getByRole('combobox', { name: /^Action/ })).toHaveTextContent('Demerger');
    expect(screen.getByRole('combobox', { name: /^Child instrument/ })).toBeInTheDocument();
    expect(field('Cost allocation %')).toHaveValue('20');
    expect(screen.getByRole('button', { name: 'Record demerger' })).toBeInTheDocument();
  });

  it('asks for the acquirer of a merger and no cost share', () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} type="merger" onClose={onClose} />);
    expect(screen.getByRole('combobox', { name: /^Acquirer instrument/ })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Cost allocation/ })).toBeNull();
    expect(screen.getByLabelText(/^Cash-in-lieu received/)).toBeInTheDocument();
  });

  it('saves a split and refreshes the page', async () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record split' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: 'i-itc' } },
      body: expect.objectContaining({ type: 'split', ratioFrom: 1, ratioTo: 2, exDate: '2026-10-13' }),
    });
    expect(toast).toHaveBeenCalledWith('Corporate action recorded');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('does not save and names the field while a ratio is wrong', async () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    fireEvent.change(field('After'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record split' }));
    expect(await screen.findByText('Enter a whole number above zero.')).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a 400 from the server as an error in the form, not a toast', async () => {
    api.POST.mockRejectedValueOnce(new ApiError(400, { code: 'VALIDATION_ERROR', message: 'A bonus needs more shares after than before' }));
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record split' }));
    expect(await screen.findByText('A bonus needs more shares after than before')).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and says why when saving fails', async () => {
    api.POST.mockRejectedValueOnce(new ApiError(500, { code: 'INTERNAL', message: 'Ex-date is in the future' }));
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record split' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Ex-date is in the future', { tone: 'danger' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('picks an instrument by typing, saving a new catalog entry as an instrument first', async () => {
    catalog.results = [{ source: 'YAHOO', type: 'stock', name: 'Zomato', symbol: 'ZOMATO', yahooSymbol: 'ZOMATO.NS' }];
    catalog.resolve.mockResolvedValue({ id: 'i-zomato', name: 'Zomato', symbol: 'ZOMATO' });
    renderWithQuery(<CorporateActionDialog onClose={onClose} />);
    fireEvent.click(screen.getByRole('combobox', { name: /^Instrument/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Zomato/ }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: /^Instrument/ })).toHaveTextContent('ZOMATO · Zomato'));
    expect(catalog.resolve).toHaveBeenCalledWith(expect.objectContaining({ name: 'Zomato', yahooSymbol: 'ZOMATO.NS' }));
  });

  it('uses a catalog entry the user already has without saving it again', async () => {
    catalog.results = [{ source: 'LOCAL', type: 'stock', name: 'Infosys', symbol: 'INFY', existingInstrumentId: 'i-infy' }];
    renderWithQuery(<CorporateActionDialog onClose={onClose} />);
    fireEvent.click(screen.getByRole('combobox', { name: /^Instrument/ }));
    fireEvent.click(await screen.findByRole('option', { name: /Infosys/ }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: /^Instrument/ })).toHaveTextContent('INFY · Infosys'));
    expect(catalog.resolve).not.toHaveBeenCalled();
  });
});

describe('CorporateActionDialog: a bonus', () => {
  it('shows the 1 → 2 hint and refuses an After that is not more than Before', async () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} type="bonus" onClose={onClose} />);
    expect(screen.getByText('For a 1:1 bonus issue, enter 1 → 2.')).toBeInTheDocument();
    fireEvent.change(field('After'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record bonus' }));
    expect(await screen.findByText(/After must be more than Before/)).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });
});

describe('CorporateActionDialog: a bonus toast', () => {
  it('reads a 1 → 2 bonus as 1:1', async () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} type="bonus" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record bonus' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Corporate action recorded');
  });
});

describe('CorporateActionDialog: the preview', () => {
  it('shows nothing until the form is valid enough to preview', () => {
    renderWithQuery(<CorporateActionDialog onClose={onClose} />);
    expect(screen.queryByText('After saving')).toBeNull();
    expect(preview).not.toHaveBeenCalled();
  });

  it('asks once the form has rested and shows the quantity and cost after saving', async () => {
    preview.mockResolvedValue(ok(previewDemerger));
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    expect(screen.getByText('After saving')).toBeInTheDocument();
    expect(screen.getByText('Calculating…')).toBeInTheDocument();
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(1));
    expect(preview).toHaveBeenCalledWith('i-itc', expect.objectContaining({ type: 'split', ratioFrom: 1, ratioTo: 2 }));
    expect(await screen.findByText('100 shares · cost ₹41,000 → ₹40,385')).toBeInTheDocument();
    expect(screen.queryByText('Calculating…')).toBeNull();
  });

  it('asks once for a burst of typing, with the last value', async () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(1)); // the form as it opens
    for (const v of ['3', '30', '300']) fireEvent.change(field('After'), { target: { value: v } });
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(2));
    expect(preview).toHaveBeenLastCalledWith('i-itc', expect.objectContaining({ ratioTo: 300 }));
    await new Promise((r) => setTimeout(r, 600));
    expect(preview).toHaveBeenCalledTimes(2);
  });

  it('ignores an answer that arrives after the form changed again', async () => {
    let first!: (v: unknown) => void;
    preview.mockImplementationOnce(() => new Promise((resolve) => (first = resolve)));
    preview.mockResolvedValueOnce(
      ok({ holdings: [{ ...previewDemerger.holdings[0], childInstrumentId: null, childQuantity: null, quantityAfter: 300, openCostAfter: 41000 }] }),
    );
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(1));
    fireEvent.change(field('After'), { target: { value: '3' } });
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('100 → 300 shares · cost ₹41,000 → ₹41,000')).toBeInTheDocument();
    await act(async () => first(ok(previewDemerger)));
    expect(screen.queryByText('100 shares · cost ₹41,000 → ₹40,385')).toBeNull();
    expect(screen.getByText('100 → 300 shares · cost ₹41,000 → ₹41,000')).toBeInTheDocument();
  });

  it('says so when the user holds none of the instrument', async () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    expect(await screen.findByText('You hold none of this instrument, so no quantity changes.')).toBeInTheDocument();
  });

  it('shows the server message when it refuses the action', async () => {
    preview.mockResolvedValue({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Ex-date is before your first trade' } });
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    expect(await screen.findByText('Ex-date is before your first trade')).toBeInTheDocument();
  });

  it('previews a saved action as a replacement of itself', async () => {
    preview.mockResolvedValue(ok(previewDemerger));
    renderWithQuery(<CorporateActionDialog action={split} onClose={onClose} />);
    expect(screen.getByText('After saving')).toBeInTheDocument();
    await waitFor(() => expect(preview).toHaveBeenCalledWith('i-itc', expect.objectContaining({ type: 'split', excludeActionId: 'ca-2' })));
    expect(await screen.findByText('100 shares · cost ₹41,000 → ₹40,385')).toBeInTheDocument();
  });

  it('does not ask again for every key typed in Notes', async () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(1));
    fireEvent.change(field('Notes'), { target: { value: 'record date 6 Jan' } });
    await new Promise((r) => setTimeout(r, 600));
    expect(preview).toHaveBeenCalledTimes(1);
  });
});

describe('CorporateActionDialog: editing and deleting', () => {
  it('opens filled from the saved action, with the instrument fixed and a Delete', () => {
    renderWithQuery(<CorporateActionDialog action={demerger} onClose={onClose} />);
    expect(screen.getByText('Edit corporate action')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Instrument/ })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /^Instrument/ })).toHaveTextContent('ITC');
    expect(screen.getByRole('combobox', { name: /^Child instrument/ })).toHaveTextContent('ITC Hotels');
    expect(screen.getByLabelText('Ex-date')).toHaveValue('06/01/2025');
    expect(field('Held')).toHaveValue('10');
    expect(field('Received')).toHaveValue('1');
    expect(field('Cost allocation %')).toHaveValue('1.5');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save demerger' })).toBeInTheDocument();
  });

  it('updates the action', async () => {
    renderWithQuery(<CorporateActionDialog action={split} onClose={onClose} />);
    fireEvent.change(field('After'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save split' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
      params: { path: { instrumentId: 'i-itc', id: 'ca-2' } },
      body: expect.objectContaining({ ratioTo: 5 }),
    });
    expect(router.refresh).toHaveBeenCalled();
  });

  it('asks before deleting and deletes after the confirmation', async () => {
    renderWithQuery(<CorporateActionDialog action={split} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog');
    expect(within(confirm).getByText(/Your trades and dividends stay/)).toBeInTheDocument();
    expect(api.DELETE).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete corporate action' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
      params: { path: { instrumentId: 'i-itc', id: 'ca-2' } },
    });
    expect(toast).toHaveBeenCalledWith('Corporate action deleted');
  });

  it('keeps the action when the confirmation is cancelled', async () => {
    renderWithQuery(<CorporateActionDialog action={split} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete corporate action?' })).toBeNull());
    expect(api.DELETE).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('says the action is gone when another tab already deleted it', async () => {
    api.PUT.mockRejectedValueOnce(new ApiError(404, { code: 'NOT_FOUND', message: 'Corporate action not found' }));
    renderWithQuery(<CorporateActionDialog action={split} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save split' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('That corporate action is no longer in your account. The list has been refreshed.');
    expect(router.refresh).toHaveBeenCalled();
  });
});
