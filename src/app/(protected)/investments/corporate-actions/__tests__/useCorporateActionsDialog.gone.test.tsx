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
import type React from 'react';
import { toast } from 'sonner';

import { CORPORATE_ACTION_GONE_MESSAGE, isCorporateActionGone } from '@/app/(protected)/investments/corporate-actions/corporateActionGone';
import { useCorporateActionsDialog } from '@/app/(protected)/investments/corporate-actions/useCorporateActionsDialog';
import { api, ApiError } from '@/lib/api/client';
import type { CorporateAction } from '@/lib/api/types';
import { createTestQueryClient } from '@/test/renderWithQuery';

const instrument = { id: 'inst-1', name: 'Acme Ltd', symbol: 'ACME' };
const split = {
  id: 'ca-1',
  instrumentId: 'inst-1',
  instrumentName: 'Acme Ltd',
  type: 'split',
  exDate: '2026-01-10',
  ratioFrom: 1,
  ratioTo: 2,
} as unknown as CorporateAction;
const gone = () => new ApiError(404, { code: 'NOT_FOUND', message: 'Corporate action not found' });
const submitEvent = { preventDefault: () => {} } as React.FormEvent;

function render(onSuccess = vi.fn()) {
  const qc = createTestQueryClient();
  const hook = renderHook(() => useCorporateActionsDialog({ instrument, open: true, onSuccess }), {
    wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
  });
  return { ...hook, onSuccess };
}

describe('isCorporateActionGone', () => {
  it('is true only for a 404 from the API', () => {
    expect(isCorporateActionGone(gone())).toBe(true);
    expect(isCorporateActionGone(new ApiError(400, { code: 'VALIDATION_ERROR', message: 'x' }))).toBe(false);
    expect(isCorporateActionGone(new Error('404'))).toBe(false);
    expect(isCorporateActionGone(undefined)).toBe(false);
  });
});

describe('useCorporateActionsDialog — edit or delete of an action that is gone (404)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saving an edit of a gone action leaves edit mode, says so and refreshes the list', async () => {
    vi.mocked(api.GET).mockResolvedValueOnce({ data: [split] } as never).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.PUT).mockRejectedValue(gone());
    const { result, onSuccess } = render();
    await waitFor(() => expect(result.current.actions).toHaveLength(1));

    act(() => result.current.handleEditClick(split));
    expect(result.current.editingActionId).toBe('ca-1');
    await act(() => result.current.handleSubmit(submitEvent));

    expect(api.PUT).toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(CORPORATE_ACTION_GONE_MESSAGE);
    expect(toast.error).not.toHaveBeenCalled();
    expect(result.current.editingActionId).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.actions).toHaveLength(0));
  });

  it('deleting a gone action says so, leaves edit mode for it and refreshes the list', async () => {
    vi.mocked(api.GET).mockResolvedValueOnce({ data: [split] } as never).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.DELETE).mockRejectedValue(gone());
    const { result } = render();
    await waitFor(() => expect(result.current.actions).toHaveLength(1));
    act(() => result.current.handleEditClick(split));

    await act(() => result.current.handleDelete('ca-1'));

    expect(toast.info).toHaveBeenCalledWith(CORPORATE_ACTION_GONE_MESSAGE);
    expect(toast.error).not.toHaveBeenCalled();
    expect(result.current.editingActionId).toBeNull();
    expect(result.current.deletingId).toBeNull();
    await waitFor(() => expect(result.current.actions).toHaveLength(0));
  });

  it('a 404 while creating (nothing being edited) is still an error', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.POST).mockRejectedValue(gone());
    const { result } = render();
    await waitFor(() => expect(api.GET).toHaveBeenCalled());

    await act(() => result.current.handleSubmit(submitEvent));

    expect(toast.error).toHaveBeenCalledWith('Corporate action not found', expect.anything());
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('other failures on an edit stay errors and keep edit mode', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [split] } as never);
    vi.mocked(api.PUT).mockRejectedValue(new ApiError(400, { code: 'VALIDATION_ERROR', message: 'Bad ratio' }));
    const { result } = render();
    await waitFor(() => expect(result.current.actions).toHaveLength(1));
    act(() => result.current.handleEditClick(split));

    await act(() => result.current.handleSubmit(submitEvent));

    expect(toast.error).toHaveBeenCalledWith('Bad ratio', expect.anything());
    expect(toast.info).not.toHaveBeenCalled();
    expect(result.current.editingActionId).toBe('ca-1');
  });
});
