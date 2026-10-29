import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestTransactionDialog } from './TestTransactionDialog';

const mutate = vi.fn();
vi.mock('@/features/rewards/queries/useRewardRecommendMutations', () => ({
  useRecommendCards: () => ({ mutate, isPending: false, data: undefined }),
}));

beforeEach(() => vi.clearAllMocks());

describe('TestTransactionDialog', () => {
  it('submitting the form from the Amount field (Enter) runs the test for this card', () => {
    render(<TestTransactionDialog accountId="a1" categories={[]} today="2026-10-13" onClose={vi.fn()} />);
    fireEvent.submit(screen.getByLabelText('Amount').closest('form') as HTMLFormElement);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toMatchObject({ amount: 5000 });
  });
});
