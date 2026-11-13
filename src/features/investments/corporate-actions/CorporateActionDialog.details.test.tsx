import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { CorporateActionDialog } from './CorporateActionDialog';
import { demergerDetails, hotels, multiDetails, noticeSource } from './corporateActionScheme.fixtures';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ unstable_rethrow: () => undefined, useRouter: () => router }));
vi.mock('@/lib/date-range', async (orig) => ({ ...(await orig<typeof import('@/lib/date-range')>()), todayInAppZone: () => '2026-10-13' }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
const preview = vi.hoisted(() => vi.fn());
vi.mock('./corporateActionActions', async (orig) => ({ ...(await orig<typeof import('./corporateActionActions')>()), loadCorporateActionPreview: preview }));
const api = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
const resolve = vi.hoisted(() => vi.fn());
vi.mock('../instruments/useCatalogSearch', () => ({
  useCatalogSearch: () => ({ results: [], isLoading: false, hasQuery: true }),
  useResolveInstrumentMutation: () => ({ mutateAsync: resolve, isPending: false }),
}));

const onClose = vi.fn();
const itc = { id: 'i-itc', name: 'ITC', symbol: 'ITC' };
const ACCEPT = '/api/v1/corporate-action-suggestions/{id}/accept';
const CREATE = '/api/v1/instruments/{instrumentId}/corporate-actions';

beforeEach(() => {
  vi.clearAllMocks();
  preview.mockResolvedValue({ success: true, data: { holdings: [] } });
  api.POST.mockResolvedValue({ data: {} });
});

const open = (details = demergerDetails(), over: Partial<React.ComponentProps<typeof CorporateActionDialog>> = {}) =>
  renderWithQuery(
    <CorporateActionDialog instrument={itc} type="demerger" prefill={{ exDate: '2025-01-06', details }} suggestionId="s-1" onClose={onClose} {...over} />,
  );

describe('CorporateActionDialog: filled from the notices', () => {
  it('fills the child, ratio and cost allocation, with a source line and link under each', async () => {
    open();
    expect(screen.getByRole('textbox', { name: /^Held/ })).toHaveValue('10');
    expect(screen.getByRole('textbox', { name: /^Received/ })).toHaveValue('1');
    expect(screen.getByLabelText(/^Cost allocation/)).toHaveValue('13.51');
    expect(screen.getByRole('combobox', { name: /Child instrument|Acquirer instrument/ })).toHaveTextContent('ITCHOTELS · ITC Hotels');
    expect(screen.getAllByText("From the company's notice of 18/12/24")).toHaveLength(1);
    expect(screen.getByText("From the company's notice of 20/01/25")).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'View notice' });
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links[0]).toHaveAttribute('href', noticeSource.url);
    expect(links[0]).toHaveAttribute('target', '_blank');
    // The detected-note text and the possible-company picker give way to the evidence.
    expect(screen.queryByText(/only says "Demerger"/)).toBeNull();
  });

  it('with an instrument id sets the child directly and accepts the suggestion without resolving', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Record demerger' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(resolve).not.toHaveBeenCalled();
    expect(api.POST).toHaveBeenCalledWith(ACCEPT, {
      params: { path: { id: 's-1' } },
      body: expect.objectContaining({ type: 'demerger', targetInstrumentId: 'i-itch', ratioFrom: 10, ratioTo: 1, costAllocationPct: 13.51 }),
    });
  });

  it('without an instrument id shows the child as chosen and adds it when saving', async () => {
    resolve.mockResolvedValue({ id: 'i-new', name: 'ITC Hotels', symbol: 'ITCHOTELS' });
    open(demergerDetails({ children: [{ ...hotels, instrumentId: null }] }));
    expect(screen.getByRole('combobox', { name: /Child instrument|Acquirer instrument/ })).toHaveTextContent('ITCHOTELS · ITC Hotels');
    expect(resolve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Record demerger' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(resolve).toHaveBeenCalledWith({ type: 'stock', name: 'ITC Hotels', symbol: 'ITCHOTELS', exchange: 'NSE', isin: 'INE000000001', yahooSymbol: 'ITCHOTELS.NS', currency: 'INR' });
    expect(api.POST).toHaveBeenCalledWith(ACCEPT, expect.objectContaining({ body: expect.objectContaining({ targetInstrumentId: 'i-new' }) }));
  });

  it('shows a resolve error inline and saves nothing', async () => {
    resolve.mockRejectedValue(new Error('Catalog is down'));
    open(demergerDetails({ children: [{ ...hotels, instrumentId: null }] }));
    fireEvent.click(screen.getByRole('button', { name: 'Record demerger' }));
    expect(await screen.findByText(/Catalog is down|Couldn't add the new company/)).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('records several children one after another: the earlier ones create, the last accepts', async () => {
    resolve.mockResolvedValue({ id: 'i-beta', name: 'Beta Co', symbol: 'BETACO' });
    open(multiDetails());
    expect(screen.getByText('New company 1 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record demerger' }));
    await waitFor(() => expect(screen.getByText('New company 2 of 3')).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
    expect(api.POST).toHaveBeenLastCalledWith(CREATE, expect.objectContaining({ body: expect.objectContaining({ targetInstrumentId: 'i-itch', costAllocationPct: 13.51 }) }));
    expect(screen.getByLabelText(/^Cost allocation/)).toHaveValue('11.56');
    expect(screen.getByText("10% of the original cost, which is 11.56% of what's left after ITC Hotels")).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Held/ })).toHaveValue('5');
    expect(screen.getByRole('textbox', { name: /^Received/ })).toHaveValue('2');

    fireEvent.click(screen.getByRole('button', { name: 'Record demerger' }));
    await waitFor(() => expect(screen.getByText('New company 3 of 3')).toBeInTheDocument());
    expect(api.POST).toHaveBeenLastCalledWith(CREATE, {
      params: { path: { instrumentId: 'i-itc' } },
      body: expect.objectContaining({ targetInstrumentId: 'i-beta', costAllocationPct: 11.56, ratioFrom: 5, ratioTo: 2 }),
    });
    expect(screen.getByLabelText(/^Cost allocation/)).toHaveValue('6.54');

    resolve.mockResolvedValue({ id: 'i-gamma', name: 'Gamma Co', symbol: 'GAMMACO' });
    fireEvent.click(screen.getByRole('button', { name: 'Record demerger' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(api.POST).toHaveBeenCalledTimes(3);
    expect(api.POST.mock.calls.filter((c) => c[0] === ACCEPT)).toHaveLength(1);
    expect(api.POST).toHaveBeenLastCalledWith(ACCEPT, {
      params: { path: { id: 's-1' } },
      body: expect.objectContaining({ targetInstrumentId: 'i-gamma', costAllocationPct: 6.54 }),
    });
  });

  it('carries the ex-date the user edited into the next child', async () => {
    resolve.mockResolvedValue({ id: 'i-beta', name: 'Beta Co', symbol: 'BETACO' });
    open(multiDetails());
    fireEvent.change(screen.getByLabelText('Ex-date'), { target: { value: '08/01/2025' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record demerger' }));
    await waitFor(() => expect(screen.getByText('New company 2 of 3')).toBeInTheDocument());
    expect(screen.getByLabelText('Ex-date')).toHaveValue('08/01/2025');
  });

  it('resumes at a later child with the cost worked from all earlier originals', () => {
    open(multiDetails(), { prefill: { exDate: '2025-01-06', details: multiDetails(), childIndex: 2 } });
    expect(screen.getByText('New company 3 of 3')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Cost allocation/)).toHaveValue('6.54');
  });

  it('says how many were recorded when the user cancels part way', async () => {
    resolve.mockResolvedValue({ id: 'i-beta', name: 'Beta Co', symbol: 'BETACO' });
    open(multiDetails());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(toast).not.toHaveBeenCalled();
    onClose.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Record demerger' }));
    await waitFor(() => expect(screen.getByText('New company 2 of 3')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(toast).toHaveBeenCalledWith('1 of 3 new companies recorded. The rest stay in Needs your review.');
    expect(onClose).toHaveBeenCalled();
  });

  it('ignores a second submit while the first is still saving', async () => {
    let release: (v: unknown) => void = () => undefined;
    api.POST.mockReturnValue(new Promise((r) => { release = r; }));
    open();
    const form = screen.getByRole('button', { name: 'Record demerger' }).closest('form') ?? document.querySelector('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    release({ data: {} });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledTimes(1);
  });

  it('opens a merger with the acquirer and ratio filled and no cost allocation', async () => {
    open(demergerDetails(), { type: 'merger', suggestionId: undefined });
    expect(screen.getByRole('textbox', { name: /^Held/ })).toHaveValue('10');
    expect(screen.queryByLabelText(/^Cost allocation/)).toBeNull();
    expect(screen.getByRole('combobox', { name: /Child instrument|Acquirer instrument/ })).toHaveTextContent('ITCHOTELS · ITC Hotels');
    fireEvent.click(screen.getByRole('button', { name: 'Record merger' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith(CREATE, expect.objectContaining({ body: expect.objectContaining({ type: 'merger', targetInstrumentId: 'i-itch' }) }));
  });

  it('keeps the ratio blank when the notices have none', () => {
    open(demergerDetails({ children: [{ ...hotels, ratioFrom: null, ratioTo: null, ratioSource: undefined }] }));
    expect(screen.getByRole('textbox', { name: /^Held/ })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /^Received/ })).toHaveValue('');
  });

  it('hides a source line once the user changes that value', () => {
    open();
    fireEvent.change(screen.getByLabelText(/^Cost allocation/), { target: { value: '15' } });
    expect(screen.queryByText("From the company's notice of 20/01/25")).toBeNull();
    expect(screen.getByText("From the company's notice of 18/12/24")).toBeInTheDocument();
  });
});
