import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  };
});

import { QueryClientProvider } from '@tanstack/react-query';

import { useCorporateActionsSection } from '@/app/(protected)/investments/corporate-actions-section/useCorporateActionsSection';
import { api } from '@/lib/api/client';
import type { CorporateAction } from '@/lib/api/types';
import { createTestQueryClient } from '@/test/renderWithQuery';

const split = {
  id: 'ca-1',
  instrumentId: 'inst-1',
  instrumentName: 'Acme Ltd',
  instrumentSymbol: 'ACME',
  type: 'split',
  exDate: '2026-01-10',
  ratioFrom: 1,
  ratioTo: 2,
} as unknown as CorporateAction;
const merger = {
  id: 'ca-2',
  instrumentId: 'inst-2',
  instrumentName: 'Old Bank',
  instrumentSymbol: null,
  targetInstrumentId: 'inst-3',
  targetInstrumentName: 'New Bank',
  targetInstrumentSymbol: 'NEWB',
  type: 'merger',
  exDate: '2025-06-01',
} as unknown as CorporateAction;

function render() {
  const qc = createTestQueryClient();
  return renderHook(() => useCorporateActionsSection(), {
    wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
  });
}

describe('useCorporateActionsSection — names come from the corporate action response', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: [split, merger] } as never);
  });

  it('loads only the corporate actions, never the paged instrument catalog', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.corporateActions).toHaveLength(2));
    expect(api.GET).toHaveBeenCalledTimes(1);
    expect(api.GET).toHaveBeenCalledWith('/api/v1/corporate-actions');
  });

  it('searches the instrument and target names / symbols on the response', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.corporateActions).toHaveLength(2));
    act(() => result.current.handleSearchChange('newb'));
    expect(result.current.sortedActions.map((a) => a.id)).toEqual(['ca-2']);
    act(() => result.current.handleSearchChange('acme'));
    expect(result.current.sortedActions.map((a) => a.id)).toEqual(['ca-1']);
  });

  it('opens the edit dialog on the instrument the action names', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.corporateActions).toHaveLength(2));
    act(() => result.current.openEditDialog(merger));
    expect(result.current.activeDialogInstrument).toEqual({ id: 'inst-2', name: 'Old Bank', symbol: null });
    expect(result.current.activeEditAction).toBe(merger);
    expect(result.current.dialogOpen).toBe(true);
  });
});
