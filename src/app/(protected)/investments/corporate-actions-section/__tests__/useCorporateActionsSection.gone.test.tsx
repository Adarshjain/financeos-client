import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

import { CORPORATE_ACTION_GONE_MESSAGE } from '@/app/(protected)/investments/corporate-actions/corporateActionGone';
import { useCorporateActionsSection } from '@/app/(protected)/investments/corporate-actions-section/useCorporateActionsSection';
import { api, ApiError } from '@/lib/api/client';
import type { CorporateAction } from '@/lib/api/types';
import { createTestQueryClient } from '@/test/renderWithQuery';

const split = {
  id: 'ca-1',
  instrumentId: 'inst-1',
  instrumentName: 'Acme Ltd',
  type: 'split',
  exDate: '2026-01-10',
  ratioFrom: 1,
  ratioTo: 2,
} as unknown as CorporateAction;

function render() {
  const qc = createTestQueryClient();
  return renderHook(() => useCorporateActionsSection(), {
    wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
  });
}

describe('useCorporateActionsSection — delete of an action that is gone (404)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('says it is no longer in the account and refreshes the list instead of failing', async () => {
    vi.mocked(api.GET).mockResolvedValueOnce({ data: [split] } as never).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.DELETE).mockRejectedValue(new ApiError(404, { code: 'NOT_FOUND', message: 'Corporate action not found' }));
    const { result } = render();
    await waitFor(() => expect(result.current.corporateActions).toHaveLength(1));

    await act(() => result.current.handleDelete('inst-1', 'ca-1'));

    expect(toast.info).toHaveBeenCalledWith(CORPORATE_ACTION_GONE_MESSAGE);
    expect(toast.error).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.corporateActions).toHaveLength(0));
    expect(result.current.deletingId).toBeNull();
  });

  it('still reports any other failure as an error and keeps the row', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [split] } as never);
    vi.mocked(api.DELETE).mockRejectedValue(new ApiError(500, { code: 'INTERNAL', message: 'Boom' }));
    const { result } = render();
    await waitFor(() => expect(result.current.corporateActions).toHaveLength(1));

    await act(() => result.current.handleDelete('inst-1', 'ca-1'));

    expect(toast.error).toHaveBeenCalledWith('Boom', expect.anything());
    expect(toast.info).not.toHaveBeenCalled();
    expect(result.current.corporateActions).toHaveLength(1);
  });
});
