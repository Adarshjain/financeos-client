import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InboxRow } from './InboxRow';
import { action, DISMISS, item, SNOOZE } from './inboxTestUtils';

const upload = action({ type: 'upload', label: 'Upload', href: '/transactions/import?account=A1' });
const skip = action({ type: 'no_statement', label: 'No statement this period', payload: { accountId: 'A1', date: '2026-10-03' } });

const renderRow = (actions = [upload, SNOOZE, DISMISS, skip]) => {
  const handlers = { onBillButton: vi.fn(), onMenuAction: vi.fn(), onSnooze: vi.fn(), onDismiss: vi.fn() };
  const row = item({ key: 'statement_expected:A1:2026-10-03', kind: 'statement_expected', title: 'Card statement missing', actions });
  render(<InboxRow item={row} highlighted={false} {...handlers} />);
  return { ...handlers, row };
};

describe('InboxRow menu', () => {
  it('shows No statement this period in the More options menu, not as a button, and runs it', async () => {
    const { onMenuAction, onBillButton, onDismiss } = renderRow();
    expect(screen.queryByRole('button', { name: 'No statement this period' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Upload' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'No statement this period' }));
    expect(onMenuAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: { accountId: 'A1', periodEnd: '2026-10-03' } }),
    );
    expect(onBillButton).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('a row without the action has no More options menu', () => {
    renderRow([upload, SNOOZE, DISMISS]);
    expect(screen.queryByRole('button', { name: 'More options' })).toBeNull();
  });
});

describe('InboxRow bill loading', () => {
  const markPaid = action({ type: 'mark_paid', label: 'Mark paid', payload: { statementId: 's1' } });
  const renderBill = (billLoading: { type: 'mark_paid'; statementId: string } | null) => {
    const row = item({ key: 'bill_due:s1', kind: 'bill_due', title: 'Card bill', actions: [markPaid, SNOOZE] });
    render(<InboxRow item={row} highlighted={false} billLoading={billLoading} onBillButton={vi.fn()} onMenuAction={vi.fn()} onSnooze={vi.fn()} onDismiss={vi.fn()} />);
  };

  it('disables the pressed bill button while its bill loads', () => {
    renderBill({ type: 'mark_paid', statementId: 's1' });
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeDisabled();
  });

  it('leaves the button live for another statement or when nothing loads', () => {
    renderBill({ type: 'mark_paid', statementId: 'other' });
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeEnabled();
  });
});
