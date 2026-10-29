import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./transactionsActions', () => ({ loadMatchingCount: vi.fn().mockResolvedValue({ success: true, data: 3 }) }));

import { renderWithQuery } from '@/test/renderWithQuery';

import { FiltersDialog } from './FiltersDialog';
import { DEFAULT_QUERY } from './transactionsUrl';

function renderDialog() {
  const onApply = vi.fn();
  const onClose = vi.fn();
  renderWithQuery(
    <FiltersDialog query={DEFAULT_QUERY} today="2026-10-29" accounts={[]} categories={[]} onApply={onApply} onClose={onClose} />,
  );
  return { onApply, onClose };
}

describe('FiltersDialog submit', () => {
  it('submitting the form (Enter in an amount field) applies the draft once', () => {
    const { onApply } = renderDialog();
    fireEvent.submit(screen.getByLabelText('From').closest('form')!);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('the primary is a submit button of that form, and Cancel applies nothing', () => {
    const { onApply, onClose } = renderDialog();
    const form = screen.getByLabelText('From').closest('form')!;
    const show = screen.getByRole('button', { name: /^Show/ });
    expect(show).toHaveAttribute('type', 'submit');
    expect(show).toHaveAttribute('form', form.id);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
