import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { RuleDialog } from './RuleDialog';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
vi.mock('../rulesRefresh', () => ({ useRefreshUsage: () => vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('RuleDialog', () => {
  it('submitting the form from the Name field (Enter) runs the save validation', () => {
    renderWithQuery(
      <RuleDialog
        accountId="a1"
        categories={[]}
        capBuckets={[]}
        cardholders={[]}
        isBank={false}
        defaultRewardType="CASH"
        defaultPriority={1}
        onClose={vi.fn()}
      />,
    );
    fireEvent.submit(screen.getByLabelText('Name').closest('form') as HTMLFormElement);
    expect(toast).toHaveBeenCalledWith('Rule name is required.', expect.anything());
  });
});
