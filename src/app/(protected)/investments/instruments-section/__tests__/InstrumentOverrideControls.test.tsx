import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { toast } from 'sonner';

import {
  InstrumentOverrideBadge,
  ResetInstrumentButton,
} from '@/app/(protected)/investments/instruments-section/InstrumentOverrideControls';
import { InstrumentsMobileCards } from '@/app/(protected)/investments/instruments-section/InstrumentsMobileCards';
import { InstrumentsTable } from '@/app/(protected)/investments/instruments-section/InstrumentsTable';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { Instrument } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

const plain: Instrument = { id: 'i-plain', type: 'stock', name: 'Plain Co', currency: 'INR', overridden: false, overriddenFields: [] };
const edited: Instrument = {
  id: 'i-edit',
  type: 'stock',
  name: 'My Name For It',
  symbol: 'MYN',
  currency: 'INR',
  overridden: true,
  overriddenFields: ['name', 'symbol'],
};

describe('InstrumentOverrideBadge', () => {
  it('renders nothing for an instrument without the user\'s edits', () => {
    const { container } = renderWithQuery(<InstrumentOverrideBadge instrument={plain} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says "Edited for your account" and lists the edited fields in its title and for screen readers', () => {
    renderWithQuery(<InstrumentOverrideBadge instrument={edited} />);
    const badge = screen.getByText('Edited for your account', { exact: false });
    expect(badge).toHaveAttribute('title', 'Edited for your account: name and symbol');
    expect(badge).toHaveTextContent('Edited for your account: name and symbol');
  });

  it('falls back to the bare label when the flag is set without a field list', () => {
    renderWithQuery(<InstrumentOverrideBadge instrument={{ ...edited, overriddenFields: [] }} />);
    expect(screen.getByText('Edited for your account')).toHaveAttribute('title', 'Edited for your account');
  });
});

describe('ResetInstrumentButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing for an instrument without the user\'s edits', () => {
    renderWithQuery(<ResetInstrumentButton instrument={plain} />);
    expect(screen.queryByRole('button', { name: 'Reset to catalog' })).toBeNull();
  });

  it('confirms, DELETEs the overrides, toasts and invalidates investments', async () => {
    vi.mocked(api.DELETE).mockResolvedValue({ data: { ...edited, name: 'Catalog Name', overridden: false, overriddenFields: [] } } as never);
    const { queryClient } = renderWithQuery(<ResetInstrumentButton instrument={edited} />);
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(screen.getByRole('button', { name: 'Reset to catalog' }));
    expect(screen.getByText('Reset to catalog?')).toBeInTheDocument();
    expect(screen.getByText(/Your edits to My Name For It \(name and symbol\) are removed/)).toBeInTheDocument();
    expect(api.DELETE).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Reset to catalog' }).at(-1)!);

    await waitFor(() =>
      expect(api.DELETE).toHaveBeenCalledWith('/api/v1/instruments/{id}/overrides', { params: { path: { id: 'i-edit' } } })
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Catalog Name reset to catalog'));
    expect(spy).toHaveBeenCalledWith({ queryKey: keys.investments.all });
  });

  it('does nothing when the confirmation is cancelled', () => {
    renderWithQuery(<ResetInstrumentButton instrument={edited} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset to catalog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.DELETE).not.toHaveBeenCalled();
  });

  it('toasts a failed reset', async () => {
    vi.mocked(api.DELETE).mockRejectedValue(new ApiError(404, { code: 'NOT_FOUND', message: 'Instrument not found' }));
    renderWithQuery(<ResetInstrumentButton instrument={edited} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset to catalog' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset to catalog' }).at(-1)!);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Instrument not found', expect.anything()));
  });
});

describe('Instrument list rows', () => {
  it.each([
    ['table', InstrumentsTable],
    ['mobile cards', InstrumentsMobileCards],
  ])('the %s show the badge and reset action only on edited instruments', (_label, View) => {
    renderWithQuery(<View pagedInstruments={[plain, edited]} />);
    expect(screen.getAllByText('Edited for your account', { exact: false })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Reset to catalog' })).toHaveLength(1);
  });
});
