import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders unchecked by default', () => {
    render(<Checkbox aria-label="Subscribe" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(checkbox).toHaveClass('w-space-16', 'h-space-16', 'rounded-ds-xs');
  });

  it('renders checked when checked=true', () => {
    render(<Checkbox checked aria-label="Subscribe" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    expect(checkbox.querySelector('svg')).toBeInTheDocument();
  });

  it('renders indeterminate state with aria-checked="mixed"', () => {
    render(<Checkbox checked="indeterminate" aria-label="Select all" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Select all' });
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
    expect(checkbox.querySelector('svg')).toBeInTheDocument();
  });

  it('toggles when clicked in controlled usage', () => {
    const TestComponent = () => {
      const [checked, setChecked] = useState<boolean | 'indeterminate'>(false);
      return (
        <Checkbox
          checked={checked}
          onCheckedChange={setChecked}
          aria-label="Toggle test"
        />
      );
    };

    render(<TestComponent />);
    const checkbox = screen.getByRole('checkbox', { name: 'Toggle test' });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('respects disabled prop and prevents toggling', () => {
    render(<Checkbox disabled aria-label="Disabled checkbox" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Disabled checkbox' });
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveClass('disabled:opacity-50');
  });

  it('maintains align-middle and identical dimensions across checked states', () => {
    const { rerender } = render(<Checkbox checked={false} aria-label="Align test" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Align test' });
    expect(checkbox).toHaveClass('align-middle', 'w-space-16', 'h-space-16');

    rerender(<Checkbox checked={true} aria-label="Align test" />);
    expect(checkbox).toHaveClass('align-middle', 'w-space-16', 'h-space-16');

    rerender(<Checkbox checked="indeterminate" aria-label="Align test" />);
    expect(checkbox).toHaveClass('align-middle', 'w-space-16', 'h-space-16');
  });
});
