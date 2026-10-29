import { fireEvent, screen, within } from '@testing-library/react';
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

describe('FiltersDialog changed filters', () => {
  it('shows no strip and no dots while everything is on its default', () => {
    renderDialog();
    expect(screen.queryByTestId('changed-filters')).toBeNull();
    expect(screen.queryByTestId('changed-status')).toBeNull();
  });

  it('lists a changed filter in the strip with a dot on its section, and × puts it back', () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText('Monitoring', { selector: '[role="switch"]' }));
    const strip = screen.getByTestId('changed-filters');
    expect(strip).toHaveTextContent('Monitoring');
    expect(screen.getByTestId('changed-status')).toBeInTheDocument();
    fireEvent.click(within(strip).getByRole('button', { name: 'Reset filter' }));
    expect(screen.queryByTestId('changed-filters')).toBeNull();
    expect(screen.queryByTestId('changed-status')).toBeNull();
  });

  it('Show says how many results', async () => {
    renderDialog();
    expect(await screen.findByRole('button', { name: 'Show 3 results' })).toBeInTheDocument();
  });
});

describe('FiltersDialog submit', () => {
  it('submitting the form (Enter in an amount field) applies the draft once', () => {
    const { onApply } = renderDialog();
    fireEvent.submit(screen.getByLabelText('From').closest('form')!);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('the primary is a submit button of that form, and Reset to defaults applies nothing', () => {
    const { onApply } = renderDialog();
    const form = screen.getByLabelText('From').closest('form')!;
    const show = screen.getByRole('button', { name: /^Show/ });
    expect(show).toHaveAttribute('type', 'submit');
    expect(show).toHaveAttribute('form', form.id);
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(onApply).not.toHaveBeenCalled();
  });
});

describe('FiltersDialog reset', () => {
  it('Reset to defaults keeps the search text', () => {
    const onApply = vi.fn();
    renderWithQuery(
      <FiltersDialog
        query={{ ...DEFAULT_QUERY, q: 'coffee', type: 'debit' }}
        today="2026-10-29"
        accounts={[]}
        categories={[]}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    fireEvent.submit(screen.getByLabelText('From').closest('form')!);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0]![0]).toMatchObject({ q: 'coffee', type: DEFAULT_QUERY.type });
  });
});
