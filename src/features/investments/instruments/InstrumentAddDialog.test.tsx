import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { InstrumentAddDialog } from './InstrumentAddDialog';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/ds/investments/instruments', useSearchParams: () => new URLSearchParams() }));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const catalog = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock('./useCatalogSearch', () => ({
  useCatalogSearch: () => ({ results: [], isLoading: false, hasQuery: false }),
  useResolveInstrumentMutation: () => ({ mutateAsync: catalog.resolve, isPending: false }),
}));

const api = vi.hoisted(() => ({ POST: vi.fn() }));
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<typeof import('@/lib/api/client')>()), api }));

const onClose = vi.fn();
const onCreated = vi.fn();
const created = { id: 'i-new', type: 'stock', name: 'Unlisted Co', symbol: 'UNL' };

beforeEach(() => {
  vi.clearAllMocks();
  api.POST.mockResolvedValue({ data: created });
});

describe('InstrumentAddDialog', () => {
  it('opens on the manual form when asked to', () => {
    renderWithQuery(<InstrumentAddDialog initialMode="manual" onClose={onClose} />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('hands the instrument it created by hand to onCreated, then refreshes and closes', async () => {
    renderWithQuery(<InstrumentAddDialog initialMode="manual" onClose={onClose} onCreated={onCreated} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Unlisted Co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add instrument' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(router.refresh).toHaveBeenCalled();
  });

  it('works without onCreated', async () => {
    renderWithQuery(<InstrumentAddDialog initialMode="manual" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Unlisted Co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add instrument' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('does not call onCreated when the name is missing', () => {
    renderWithQuery(<InstrumentAddDialog initialMode="manual" onClose={onClose} onCreated={onCreated} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add instrument' }));
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
