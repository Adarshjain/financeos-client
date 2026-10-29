import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditDetailsDialog } from './EditDetailsDialog';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const updateDetails = vi.fn();
vi.mock('@/lib/query/hooks/useBills', () => ({
  useBillMutations: () => ({ updateDetails: { mutateAsync: updateDetails, isPending: false } }),
}));
vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-13' }));

beforeEach(() => {
  vi.clearAllMocks();
  updateDetails.mockResolvedValue({});
});

describe('EditDetailsDialog', () => {
  it('submitting the form from a field (Enter) saves what changed', async () => {
    const onOpenChange = vi.fn();
    render(
      <EditDetailsDialog
        open
        onOpenChange={onOpenChange}
        statementId="s1"
        statementLabel="Statement · 5 Oct 26"
        initial={{ periodStart: '2026-09-06', periodEnd: '2026-10-05', dueDate: '2026-10-25', totalDue: 100, minimumDue: 10 }}
      />,
    );
    const input = screen.getByLabelText('Minimum due');
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    await waitFor(() => expect(updateDetails).toHaveBeenCalledWith({ statementId: 's1', body: { minimumAmountDue: 20 } }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
