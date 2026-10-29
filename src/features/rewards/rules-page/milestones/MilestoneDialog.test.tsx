import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { MilestoneDialog } from './MilestoneDialog';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
vi.mock('../rulesRefresh', () => ({ useRefreshUsage: () => vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('MilestoneDialog', () => {
  it('submitting the form from the Name field (Enter) runs the save validation', () => {
    renderWithQuery(
      <MilestoneDialog accountId="a1" cardholders={[]} isBank={false} categories={[]} defaultRewardType="CASH" onClose={vi.fn()} />,
    );
    fireEvent.submit(screen.getByLabelText('Name').closest('form') as HTMLFormElement);
    expect(toast).toHaveBeenCalledWith('Milestone name is required.', expect.anything());
  });
});
