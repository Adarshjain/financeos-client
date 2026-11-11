import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { CorporateActionDialog } from './CorporateActionDialog';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ unstable_rethrow: () => undefined, useRouter: () => router }));
vi.mock('@/lib/date-range', async (orig) => ({ ...(await orig<typeof import('@/lib/date-range')>()), todayInAppZone: () => '2026-10-13' }));
const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
const preview = vi.hoisted(() => vi.fn());
vi.mock('./corporateActionActions', async (orig) => ({ ...(await orig<typeof import('./corporateActionActions')>()), loadCorporateActionPreview: preview }));
const api = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('../instruments/useCatalogSearch', () => ({
  useCatalogSearch: () => ({ results: [], isLoading: false, hasQuery: true }),
  useResolveInstrumentMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const onClose = vi.fn();
const itc = { id: 'i-itc', name: 'ITC', symbol: 'ITC' };

beforeEach(() => {
  vi.clearAllMocks();
  preview.mockResolvedValue({ success: true, data: { holdings: [] } });
  api.POST.mockResolvedValue({ data: {} });
});

describe('CorporateActionDialog: a detected suggestion', () => {
  it('opens on the detected date and ratio and accepts the suggestion instead of creating', async () => {
    renderWithQuery(
      <CorporateActionDialog instrument={itc} type="bonus" prefill={{ exDate: '2025-01-15', ratioFrom: 1, ratioTo: 2 }} suggestionId="s-1" onClose={onClose} />,
    );
    expect(screen.getByLabelText('Ex-date')).toHaveValue('15/01/2025');
    expect(screen.getByRole('combobox', { name: /^Action/ })).toHaveTextContent('Bonus issue');
    fireEvent.click(screen.getByRole('button', { name: 'Record bonus' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledTimes(1);
    expect(api.POST).toHaveBeenCalledWith('/api/v1/corporate-action-suggestions/{id}/accept', {
      params: { path: { id: 's-1' } },
      body: expect.objectContaining({ type: 'bonus', ratioFrom: 1, ratioTo: 2, exDate: '2025-01-15' }),
    });
    expect(toast).toHaveBeenCalledWith('Corporate action recorded');
  });

  it('without a suggestion still creates', async () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record split' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/corporate-actions', expect.anything());
  });
});

describe('CorporateActionDialog: delisted', () => {
  it('asks only for the instrument and the date, and sends 1 → 1', async () => {
    renderWithQuery(<CorporateActionDialog instrument={itc} type="delisted" onClose={onClose} />);
    expect(screen.getByLabelText('Ex-date')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Before/ })).toBeNull();
    expect(screen.queryByRole('textbox', { name: /^After/ })).toBeNull();
    expect(screen.queryByLabelText(/^Cash-in-lieu received/)).toBeNull();
    expect(screen.queryByLabelText(/Child instrument|Acquirer instrument/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Record delisted' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.POST).toHaveBeenCalledWith('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: 'i-itc' } },
      body: expect.objectContaining({ type: 'delisted', ratioFrom: 1, ratioTo: 1, exDate: '2026-10-13' }),
    });
  });
});
