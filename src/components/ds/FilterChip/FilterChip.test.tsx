import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FilterChip } from './FilterChip';

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

  it('applies selected styling when selected is true', () => {
    const { container } = render(<FilterChip selected>All · 64</FilterChip>);
    const chip = container.querySelector('button');
    expect(chip).toHaveClass('bg-brand-tint');
    expect(chip).toHaveClass('text-brand-strong');
  });

  it('applies warning styling when tone="warning" and selected', () => {
    const { container } = render(
      <FilterChip tone="warning" selected>
        Needs review · 25
      </FilterChip>,
    );
    const chip = container.querySelector('button');
    expect(chip).toHaveClass('bg-warning-tint');
    expect(chip).toHaveClass('text-warning');
  });

  it('applies dashed border when variant="dashed"', () => {
    const { container } = render(<FilterChip variant="dashed">+ More</FilterChip>);
    const chip = container.querySelector('button');
    expect(chip).toHaveClass('border-dashed');
  });

  it('renders removable button and calls onRemove without triggering chip selection', () => {
    const handleClick = vi.fn();
    const handleRemove = vi.fn();
    const handleSelectedChange = vi.fn();

    render(
      <FilterChip
        selected
        removable
        onClick={handleClick}
        onRemove={handleRemove}
        onSelectedChange={handleSelectedChange}
      >
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
    expect(handleSelectedChange).not.toHaveBeenCalled();

    // Clicking chip triggers handleClick and toggles selection
    fireEvent.click(chipBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleSelectedChange).toHaveBeenCalledWith(false);
  });

  it('handles uncontrolled toggling and calls onSelectedChange', () => {
    const handleSelectedChange = vi.fn();
    render(
      <FilterChip defaultSelected={false} onSelectedChange={handleSelectedChange}>
        Toggle chip
      </FilterChip>,
    );
    const chip = screen.getByRole('button', { name: 'Toggle chip' });
    fireEvent.click(chip);
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
  });

  it('prevents click when disabled', () => {
    const handleClick = vi.fn();
    const handleSelectedChange = vi.fn();
    render(
      <FilterChip disabled onClick={handleClick} onSelectedChange={handleSelectedChange}>
        Disabled chip
      </FilterChip>,
    );
    const chip = screen.getByRole('button');
    expect(chip).toBeDisabled();

    fireEvent.click(chip);
    expect(handleClick).not.toHaveBeenCalled();
    expect(handleSelectedChange).not.toHaveBeenCalled();
  });

  it('forwards ref to outermost element when removable vs not removable', () => {
    const buttonRef = React.createRef<HTMLButtonElement>();
    const { rerender } = render(
      <FilterChip ref={buttonRef}>
        Button ref
      </FilterChip>,
    );
    expect(buttonRef.current).toBeInstanceOf(HTMLButtonElement);

    const spanRef = React.createRef<HTMLButtonElement>();
    rerender(
      <FilterChip ref={spanRef} removable>
        Span ref
      </FilterChip>,
    );
    expect(spanRef.current).toBeInstanceOf(HTMLSpanElement);
  });
});
