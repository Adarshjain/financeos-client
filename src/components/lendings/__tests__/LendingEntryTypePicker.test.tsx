import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LendingEntryTypePicker } from '../LendingEntryTypePicker';

describe('LendingEntryTypePicker', () => {
  it('renders the four entry types as radios under money-out / money-in, with the value checked', () => {
    render(<LendingEntryTypePicker value="repaid_to_me" onChange={vi.fn()} />);

    expect(screen.getByText('Money out')).toBeInTheDocument();
    expect(screen.getByText('Money in')).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(screen.getByLabelText('I lent money')).not.toBeChecked();
    expect(screen.getByLabelText('I paid back what I owed')).not.toBeChecked();
    expect(screen.getByLabelText('I borrowed money')).not.toBeChecked();
    expect(screen.getByLabelText('They paid me back')).toBeChecked();
    radios.forEach((radio) => expect(radio).not.toBeDisabled());
  });

  it('reports the picked type', () => {
    const onChange = vi.fn();
    render(<LendingEntryTypePicker value="lent" onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('I paid back what I owed'));

    expect(onChange).toHaveBeenCalledWith('repaid_by_me');
  });

  it('disables the types outside `enabled` and shows the locked hint', () => {
    render(
      <LendingEntryTypePicker
        value="lent"
        onChange={vi.fn()}
        enabled={['lent', 'repaid_by_me']}
        lockedHint="Unlink the transaction to change direction."
      />,
    );

    expect(screen.getByLabelText('I lent money')).not.toBeDisabled();
    expect(screen.getByLabelText('I paid back what I owed')).not.toBeDisabled();
    expect(screen.getByLabelText('I borrowed money')).toBeDisabled();
    expect(screen.getByLabelText('They paid me back')).toBeDisabled();
    expect(screen.getByText('Unlink the transaction to change direction.')).toBeInTheDocument();
  });

  it('shows no locked hint when every type is enabled', () => {
    render(
      <LendingEntryTypePicker value="lent" onChange={vi.fn()} lockedHint="Unlink to change direction." />,
    );

    expect(screen.queryByText('Unlink to change direction.')).not.toBeInTheDocument();
  });

  it('uses the given radio group name and label', () => {
    render(<LendingEntryTypePicker value="lent" onChange={vi.fn()} name="addType" label="What happened? *" />);

    expect(screen.getByText('What happened? *')).toBeInTheDocument();
    screen.getAllByRole('radio').forEach((radio) => expect(radio).toHaveAttribute('name', 'addType'));
  });
});
