import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CategoryChip } from './CategoryChip';

describe('CategoryChip component', () => {
  it('renders default category chip with text', () => {
    render(<CategoryChip>Food & dining</CategoryChip>);
    const chip = screen.getByText('Food & dining');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('bg-subtle', 'text-ink-2', 'border-line');
  });

  it('renders count variant when count prop is passed', () => {
    render(<CategoryChip count={2} />);
    const chip = screen.getByText('+2');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('bg-surface', 'text-ink-3', 'border-line');
  });

  it('renders unset variant with dashed border and warning text', () => {
    render(<CategoryChip variant="unset" />);
    const chip = screen.getByText('Set category');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass(
      'border-dashed',
      'border-warning-border',
      'bg-surface',
      'text-warning',
    );
  });

  it('renders as button when onClick is provided and handles clicks', () => {
    const handleClick = vi.fn();
    render(<CategoryChip onClick={handleClick}>Groceries</CategoryChip>);
    const button = screen.getByRole('button', { name: 'Groceries' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('cursor-pointer');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders asChild with Slot', () => {
    render(
      <CategoryChip asChild>
        <a href="#category-link">Dining</a>
      </CategoryChip>,
    );
    const link = screen.getByRole('link', { name: 'Dining' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#category-link');
    expect(link).toHaveClass('bg-subtle', 'text-ink-2');
  });
});
