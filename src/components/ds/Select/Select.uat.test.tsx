import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Select, SelectMenu, type SelectOption } from './Select';

const options: SelectOption[] = [
  { value: 'food', label: 'Food & dining' },
  { value: 'groc', label: 'Groceries' },
  { value: 'travel', label: 'Travel' },
  { value: 'bills', label: 'Bills' },
];

function mockChipLayout({ row, chip, overflow }: { row: number; chip: number; overflow: number }) {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(row);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const width = this.hasAttribute('data-chip-overflow') ? overflow : this.hasAttribute('data-chip-key') ? chip : 0;
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0, toJSON: () => ({}) };
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Select label (not a tap target)', () => {
  it('renders the label as plain text, not a <label>', () => {
    render(<Select label="Category" options={options} />);
    expect(document.querySelector('label')).toBeNull();
    expect(screen.getByText('Category').tagName).not.toBe('LABEL');
  });

  it('tapping the label does not open the dropdown, and getByLabelText still finds the control', () => {
    render(<Select label="Category" options={options} />);
    fireEvent.click(screen.getByText('Category'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBe(screen.getByRole('combobox'));
  });
});

describe('Select multiple: Discard & close', () => {
  it('restores the value from when the popover opened, then closes', () => {
    const onValueChange = vi.fn();
    render(<Select multiple options={options} defaultValue={['food']} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Groceries'));
    fireEvent.click(screen.getByText('Travel'));
    expect(onValueChange).toHaveBeenLastCalledWith(['food', 'groc', 'travel']);
    fireEvent.click(screen.getByRole('button', { name: 'Discard & close' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['food']);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('calls onValueChange nothing when the value did not change, and still closes', () => {
    const onValueChange = vi.fn();
    render(<Select multiple options={options} defaultValue={['food']} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard & close' }));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('restores the value of the latest open, not an earlier one', () => {
    const onValueChange = vi.fn();
    render(<Select multiple options={options} defaultValue={[]} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Groceries'));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Travel'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard & close' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['groc']);
  });

  it('works when controlled', () => {
    const onValueChange = vi.fn();
    render(<Select multiple options={options} value={['food']} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Bills'));
    // controlled: the parent did not apply it, so the value is still the one from open
    fireEvent.click(screen.getByRole('button', { name: 'Discard & close' }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('draws Clear, Discard & close, Done left to right, with an overridable label', () => {
    render(<Select multiple options={options} defaultOpen discardLabel="Cancel changes" />);
    const buttons = screen.getAllByRole('button').filter((b) => ['Clear', 'Cancel changes', 'Done'].includes(b.textContent ?? ''));
    expect(buttons.map((b) => b.textContent)).toEqual(['Clear', 'Cancel changes', 'Done']);
  });

  it('Escape keeps today\'s behaviour: the selection stays', () => {
    const onValueChange = vi.fn();
    render(<Select multiple options={options} defaultValue={[]} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Groceries'));
    fireEvent.keyDown(screen.getByRole('listbox').parentElement as HTMLElement, { key: 'Escape' });
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('a standalone SelectMenu shows Discard only when given onDiscard', () => {
    const { rerender } = render(<SelectMenu options={options} multiple />);
    expect(screen.queryByRole('button', { name: 'Discard & close' })).not.toBeInTheDocument();
    const onDiscard = vi.fn();
    rerender(<SelectMenu options={options} multiple onDiscard={onDiscard} />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard & close' }));
    expect(onDiscard).toHaveBeenCalled();
  });
});

describe('Select multiple: chips fit one line', () => {
  const all = ['food', 'groc', 'travel', 'bills'];

  it('shows every chip and no +n when they all fit', () => {
    mockChipLayout({ row: 400, chip: 60, overflow: 30 });
    render(<Select multiple options={options} defaultValue={all} />);
    all.forEach((_, i) => expect(screen.getByText(options[i].label)).toBeInTheDocument());
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it('shows as many chips as fit, with the +n badge among them', () => {
    mockChipLayout({ row: 150, chip: 60, overflow: 30 });
    render(<Select multiple options={options} defaultValue={all} />);
    expect(screen.getByText('Food & dining')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.queryByText('Travel')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('keeps the +n badge on a narrower trigger by dropping chips', () => {
    mockChipLayout({ row: 100, chip: 60, overflow: 30 });
    render(<Select multiple options={options} defaultValue={all} />);
    expect(screen.getByText('Food & dining')).toBeInTheDocument();
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('shows the first chip truncated beside +n when not even it fits', () => {
    mockChipLayout({ row: 70, chip: 60, overflow: 30 });
    render(<Select multiple options={options} defaultValue={all} />);
    const first = screen.getByText('Food & dining');
    expect(first).toHaveClass('truncate');
    expect(first.parentElement).toHaveClass('shrink', 'min-w-0');
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('shows one chip wider than the row truncated, with no badge', () => {
    mockChipLayout({ row: 40, chip: 60, overflow: 30 });
    render(<Select multiple options={options} defaultValue={['food']} />);
    expect(screen.getByText('Food & dining').parentElement).toHaveClass('shrink', 'min-w-0');
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it('never wraps the row', () => {
    mockChipLayout({ row: 150, chip: 60, overflow: 30 });
    render(<Select multiple options={options} defaultValue={all} />);
    const row = screen.getByText('Food & dining').parentElement?.parentElement as HTMLElement;
    expect(row).toHaveClass('flex-nowrap', 'overflow-hidden');
    expect(row).not.toHaveClass('flex-wrap');
  });

  it('has no maxDisplayChips: three chips fit when the row is wide, however many are selected', () => {
    mockChipLayout({ row: 300, chip: 60, overflow: 30 });
    render(<Select multiple options={options} defaultValue={all} />);
    expect(screen.getByText('Travel')).toBeInTheDocument();
  });
});

describe('Select chips measured after a late mount', () => {
  it('fits the chips once loading ends and the row appears', () => {
    mockChipLayout({ row: 150, chip: 60, overflow: 30 });
    const all = ['food', 'groc', 'travel', 'bills'];
    const { rerender } = render(<Select multiple loading options={options} defaultValue={all} />);
    rerender(<Select multiple options={options} defaultValue={all} />);
    expect(screen.getByText('Food & dining')).toBeInTheDocument();
    expect(screen.queryByText('Travel')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('does not cache zero widths from a hidden mount: measures again when laid out', () => {
    let visible = false;
    let notify: () => void = () => {};
    vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { notify = cb; } observe() {} disconnect() {} unobserve() {} });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => (visible ? 150 : 0));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const w = !visible ? 0 : this.hasAttribute('data-chip-overflow') ? 30 : this.hasAttribute('data-chip-key') ? 60 : 0;
      return { width: w, height: 0, top: 0, left: 0, right: w, bottom: 0, x: 0, y: 0, toJSON: () => ({}) };
    });
    const all = ['food', 'groc', 'travel', 'bills'];
    render(<Select multiple options={options} defaultValue={all} />);
    expect(screen.getByText('Travel')).toBeInTheDocument();
    visible = true;
    act(() => notify());
    expect(screen.queryByText('Travel')).not.toBeInTheDocument();
  });
});

describe('Select disabled', () => {
  it('looks like a disabled TextField and takes no hover, focus or open styling', () => {
    render(<Select disabled open options={options} defaultValue="food" error="Pick one" />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveClass('bg-sunken', 'text-ink-faint', 'border-line', 'cursor-not-allowed', 'opacity-60');
    expect(trigger.className).not.toMatch(/hover:|focus-visible:|ring-|border-danger|border-line-strong/);
  });

  it('draws the chevron faint', () => {
    render(<Select disabled options={options} defaultValue="food" />);
    const trigger = screen.getByRole('combobox');
    expect(trigger.querySelector('svg')).toHaveClass('text-ink-faint');
  });

  it('does not open on click', () => {
    render(<Select disabled options={options} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
