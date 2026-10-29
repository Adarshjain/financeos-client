import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CapDialog } from './CapDialog';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const create = vi.fn();
vi.mock('@/features/rewards/queries/useRewardCapBucketsQueries', () => ({
  useCreateRewardCapBucket: () => ({ mutate: create, isPending: false }),
  useUpdateRewardCapBucket: () => ({ mutate: vi.fn(), isPending: false }),
}));

beforeEach(() => vi.clearAllMocks());

describe('CapDialog', () => {
  it('submitting the form from the Name field (Enter) runs the save validation', () => {
    render(<CapDialog accountId="a1" usedByRules={false} onClose={vi.fn()} />);
    fireEvent.submit(screen.getByLabelText('Name').closest('form') as HTMLFormElement);
    expect(toast).toHaveBeenCalledWith('Enter a cap name.', { tone: 'danger' });
    expect(create).not.toHaveBeenCalled();
  });
});
