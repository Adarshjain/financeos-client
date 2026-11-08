import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const unmarkPaid = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('@/lib/query/hooks/useBills', () => ({ useBillMutations: () => ({ unmarkPaid }) }));
vi.mock('./useStatementSkip', () => ({ useStatementSkip: () => ({ skip: vi.fn(), undo: vi.fn(), undoing: null }) }));
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: vi.fn() }));

import type { StatementsListRow } from './listModel';
import { StatementsListCard } from './StatementsListCard';

const rows = [
  {
    kind: 'statement',
    row: { id: 's1', title: 'Oct statement', caption: 'Paid', selected: false, undo: true, verdict: null, badge: null },
  },
] as unknown as StatementsListRow[];

function renderIt() {
  return render(<StatementsListCard accountId="a1" isCard fy="2026" fyOptions={['2026', '2025']} rows={rows} />);
}

const undoBtn = () => screen.getAllByRole('button', { name: 'Undo' })[0];

beforeEach(() => vi.clearAllMocks());

describe('StatementsListCard', () => {
  it('opens a statement by replacing the address, not pushing', async () => {
    renderIt();
    fireEvent.click(screen.getByText('Oct statement'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/accounts/a1/statements?statement=s1&fy=2026', { scroll: false }));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shows Undo loading while the payment mark is removed, and ignores a second press', async () => {
    let finish: () => void = () => undefined;
    unmarkPaid.mutateAsync.mockReturnValue(new Promise<void>((res) => (finish = res)));
    renderIt();
    fireEvent.click(undoBtn());
    await waitFor(() => expect(undoBtn()).toBeDisabled());
    fireEvent.click(undoBtn());
    expect(unmarkPaid.mutateAsync).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(undoBtn()).toBeEnabled());
  });

  it('works again after a failed undo', async () => {
    unmarkPaid.mutateAsync.mockRejectedValue(new Error('x'));
    renderIt();
    fireEvent.click(undoBtn());
    await waitFor(() => expect(undoBtn()).toBeEnabled());
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
