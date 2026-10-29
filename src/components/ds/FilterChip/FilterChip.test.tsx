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

  it('defaults to the 28px pill', () => {
    const { container } = render(<FilterChip>Category</FilterChip>);
    expect(container.querySelector('button')).toHaveClass('h-space-28', 'rounded-ds-pill');
  });

  it('size md uses the control height and shape rounded the field corners on the plain chip', () => {
    const { container } = render(<FilterChip size="md" shape="rounded">Category</FilterChip>);
    const chip = container.querySelector('button');
    expect(chip).toHaveClass('h-control-md', 'rounded-ds-md');
    expect(chip).not.toHaveClass('h-space-28', 'rounded-ds-pill');
  });

  it('size and shape apply to the removable chip and its inner buttons', () => {
    const { container } = render(<FilterChip size="md" shape="rounded" removable>Category</FilterChip>);
    const wrap = container.querySelector('span') as HTMLElement;
    expect(wrap).toHaveClass('h-control-md', 'rounded-ds-md');
    const [main, remove] = Array.from(container.querySelectorAll('button'));
    expect(main).toHaveClass('rounded-l-ds-md');
    expect(remove).toHaveClass('rounded-r-ds-md');
  });

  it('removable chip keeps pill inner corners by default', () => {
    const { container } = render(<FilterChip removable>Category</FilterChip>);
    const [main, remove] = Array.from(container.querySelectorAll('button'));
    expect(main).toHaveClass('rounded-l-ds-pill');
    expect(remove).toHaveClass('rounded-r-ds-pill');
  });

  it('a changed chip is dark, shows the value and its x resets it', () => {
    const onReset = vi.fn();
    const { container } = render(
      <FilterChip changed onReset={onReset}>
        Stocks
      </FilterChip>,
    );
    expect(container.firstChild).toHaveClass('bg-ink', 'text-on-brand');
    expect(screen.getByText('Stocks')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('a chip on its default is plain and has no x', () => {
    const { container } = render(<FilterChip>Type</FilterChip>);
    expect(container.querySelector('button')).not.toHaveClass('bg-ink');
    expect(screen.queryByRole('button', { name: 'Reset filter' })).toBeNull();
  });

  it('changed without onReset has no x', () => {
    render(<FilterChip changed>Stocks</FilterChip>);
    expect(screen.queryByRole('button', { name: 'Reset filter' })).toBeNull();
  });
});
