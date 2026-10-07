import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LinkTypeSelector } from '@/components/transactions/link-dialog/LinkTypeSelector';

function renderSelector(overrides: Partial<React.ComponentProps<typeof LinkTypeSelector>> = {}) {
  return render(
    <LinkTypeSelector
      kind="TRANSFER"
      setKind={vi.fn()}
      note=""
      setNote={vi.fn()}
      alignRefundCategories
      setAlignRefundCategories={vi.fn()}
      disabledKinds={{}}
      {...overrides}
    />,
  );
}

describe('LinkTypeSelector DIVIDEND', () => {
  it('lists "Dividend received" and keeps it enabled by default', () => {
    renderSelector();
    fireEvent.click(screen.getByRole('combobox'));
    const option = within(screen.getByRole('listbox'))
      .getByText('Dividend received')
      .closest('[role="option"]');
    expect(option).not.toHaveAttribute('data-disabled');
  });

  it('disables the option and prints the reason when disabledKinds.DIVIDEND is set', () => {
    renderSelector({ disabledKinds: { DIVIDEND: 'Dividends must be money-in (credit) transactions' } });
    expect(
      screen.getByText('Dividend received: Dividends must be money-in (credit) transactions'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox'));
    const option = within(screen.getByRole('listbox'))
      .getByText('Dividend received')
      .closest('[role="option"]');
    expect(option).toHaveAttribute('data-disabled');
  });

  it('hides the note field when DIVIDEND is the active (record) kind', () => {
    renderSelector({ kind: 'DIVIDEND' });
    expect(screen.queryByText('Note (Optional)')).not.toBeInTheDocument();
  });
});
