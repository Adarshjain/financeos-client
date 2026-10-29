import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardSettingsDialog } from './CardSettings';

const mutate = vi.fn();
vi.mock('../queries/useRewardAccountConfigQueries', () => ({
  useRewardAccountConfig: () => ({ data: undefined }),
  useUpdateRewardAccountConfig: () => ({ mutate, isPending: false }),
}));
vi.mock('./rulesRefresh', () => ({ useRefreshUsage: () => vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('CardSettingsDialog', () => {
  it('submitting the form from the Point value field (Enter) saves the settings', () => {
    render(<CardSettingsDialog accountId="a1" rewardType="POINTS" pointValue="0.5" onClose={vi.fn()} />);
    fireEvent.submit(screen.getByLabelText(/Point value/).closest('form') as HTMLFormElement);
    expect(mutate).toHaveBeenCalledWith(
      { accountId: 'a1', defaultRewardType: 'POINTS', pointValueInr: 0.5 },
      expect.anything(),
    );
  });
});
