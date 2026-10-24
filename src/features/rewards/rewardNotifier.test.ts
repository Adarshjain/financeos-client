import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';

import { dsRewardNotifier } from './rewardNotifier';

const showToast = vi.fn();
vi.mock('@/components/ds', () => ({ showToast: (...a: unknown[]) => showToast(...a) }));
const record = vi.fn();
vi.mock('@/lib/diagnostics/errorLog', () => ({ errorLog: { record: (...a: unknown[]) => record(...a) } }));

beforeEach(() => vi.clearAllMocks());

describe('dsRewardNotifier', () => {
  it('shows success and validation messages as Dinero toasts', () => {
    dsRewardNotifier.success('Rule created');
    dsRewardNotifier.error('Rule name is required.');
    expect(showToast).toHaveBeenNthCalledWith(1, 'Rule created');
    expect(showToast).toHaveBeenNthCalledWith(2, 'Rule name is required.', { tone: 'danger' });
  });

  it('shows a failure with the server’s message, or the fallback, and records it for diagnostics', () => {
    const err = new ApiError(409, { message: 'Cap is full' } as never);
    dsRewardNotifier.failure(err, 'Failed to save reward rule');
    expect(showToast).toHaveBeenCalledWith('Cap is full', { tone: 'danger' });
    expect(record).toHaveBeenCalledWith(err, { message: 'Cap is full' });
    dsRewardNotifier.failure(undefined, 'Failed to save reward rule');
    expect(showToast).toHaveBeenLastCalledWith('Failed to save reward rule', { tone: 'danger' });
  });
});
