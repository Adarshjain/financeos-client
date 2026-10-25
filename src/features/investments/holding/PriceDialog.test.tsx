import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { manualPrice } from './holding.fixtures';
import { priceRow } from './holdingModel';
import { PriceDialog } from './PriceDialog';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const api = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn(), GET: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

const onClose = vi.fn();
const row = priceRow(manualPrice);

function open() {
  renderWithQuery(<PriceDialog instrumentId="i-infy" name="Infosys" target={{ kind: 'edit', row }} onClose={onClose} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.PUT.mockResolvedValue({ data: {} });
});

describe('PriceDialog editing a manual price', () => {
  it('has an enabled date prefilled with the price date', () => {
    open();
    const date = screen.getByLabelText('As of') as HTMLInputElement;
    expect(date.disabled).toBe(false);
    expect(date.value).toBe('10/10/2026');
  });

  it('sends no asOf when only the amount changed', async () => {
    open();
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save price' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT.mock.calls[0][1].body).toEqual({ price: 1500 });
    expect(toast).toHaveBeenCalledWith('Price updated');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('sends asOf when the date changed', async () => {
    open();
    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '03/10/2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save price' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT.mock.calls[0][1].body).toEqual({ price: 1470, asOf: '2026-10-03' });
  });

  it('shows a DUPLICATE 409 on the date field and stays open', async () => {
    const message = 'A price for 3 Oct 2026 already exists. Edit that one instead.';
    api.PUT.mockRejectedValue(new ApiError(409, { code: 'DUPLICATE', message, timestamp: '2026-10-25T00:00:00Z' }));
    open();
    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '03/10/2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save price' }));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
