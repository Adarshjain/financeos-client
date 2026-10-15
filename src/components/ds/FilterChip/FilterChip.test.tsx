import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FilterChip, FilterChipRow } from './FilterChip';

describe('FilterChip', () => {
  it('renders label text', () => {
    render(<FilterChip>Category</FilterChip>);
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('renders dropdown caret when hasDropdown is true', () => {
    const { container } = render(<FilterChip hasDropdown>Account</FilterChip>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders count badge when count is specified', () => {
    render(<FilterChip count={3}>Category</FilterChip>);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies active styling when active is true', () => {
    const { container } = render(<FilterChip active>All · 64</FilterChip>);
    const chip = container.querySelector('button');
    expect(chip).toHaveClass('bg-brand-tint');
    expect(chip).toHaveClass('text-brand-strong');
  });

  it('applies amber review styling when variant="amber" and active', () => {
    const { container } = render(
      <FilterChip variant="amber" active>
        Needs review · 25
      </FilterChip>,
    );
    const chip = container.querySelector('button');
    expect(chip).toHaveClass('bg-warning-tint');
    expect(chip).toHaveClass('text-warning');
  });

  it('applies dashed border when variant="more"', () => {
    const { container } = render(<FilterChip variant="more">+ More</FilterChip>);
    const chip = container.querySelector('button');
    expect(chip).toHaveClass('border-dashed');
  });

  it('renders removable button and calls onRemove without triggering chip onClick', () => {
    const handleClick = vi.fn();
    const handleRemove = vi.fn();

    render(
      <FilterChip active removable onClick={handleClick} onRemove={handleRemove}>
        This year
      </FilterChip>,
    );

    const removeBtn = screen.getByRole('button', { name: 'Remove filter' });
    const chipBtn = screen.getByRole('button', { name: 'This year' });
    expect(removeBtn).toBeInTheDocument();
    expect(chipBtn).toBeInTheDocument();

    // Verify they are sibling buttons, not nested
    expect(chipBtn.contains(removeBtn)).toBe(false);
    expect(removeBtn.contains(chipBtn)).toBe(false);

    // Clicking remove triggers handleRemove only
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
    expect(handleClick).not.toHaveBeenCalled();

    // Clicking chip triggers handleClick only
    fireEvent.click(chipBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('prevents click when disabled', () => {
    const handleClick = vi.fn();
    render(
      <FilterChip disabled onClick={handleClick}>
        Disabled chip
      </FilterChip>,
    );
    const chip = screen.getByRole('button');
    expect(chip).toBeDisabled();

    fireEvent.click(chip);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('FilterChipRow', () => {
  it('renders children within a flex container', () => {
    render(
      <FilterChipRow>
        <FilterChip>One</FilterChip>
        <FilterChip>Two</FilterChip>
      </FilterChipRow>,
    );
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
  });
});
