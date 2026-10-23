import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from './SegmentedControl';


function mockLayout(positions: Record<string, [number, number]>) {
  const label = (el: HTMLElement) => (el.textContent ?? '').trim();
  const left = vi
    .spyOn(HTMLElement.prototype, 'offsetLeft', 'get')
    .mockImplementation(function (this: HTMLElement) {
      return positions[label(this)]?.[0] ?? 0;
    });
  const width = vi
    .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
    .mockImplementation(function (this: HTMLElement) {
      return positions[label(this)]?.[1] ?? 0;
    });
  return () => {
    left.mockRestore();
    width.mockRestore();
  };
}

describe('SegmentedControl', () => {
  it('renders options as radio buttons with first tabbable when none selected', () => {
    render(<SegmentedControl options={['Debit', 'Credit']} />);
    const group = screen.getByRole('radiogroup');
    expect(group).toBeInTheDocument();

    const debit = screen.getByRole('radio', { name: 'Debit' });
    const credit = screen.getByRole('radio', { name: 'Credit' });
    expect(debit).toBeInTheDocument();
    expect(credit).toBeInTheDocument();
    expect(debit).toHaveAttribute('aria-checked', 'false');
    expect(credit).toHaveAttribute('aria-checked', 'false');
    expect(debit).toHaveAttribute('tabindex', '0');
    expect(credit).toHaveAttribute('tabindex', '-1');
  });

  it('selects option specified by defaultValue', () => {
    render(
      <SegmentedControl
        options={['Debit', 'Credit']}
        defaultValue="Credit"
      />,
    );
    expect(screen.getByRole('radio', { name: 'Debit' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('radio', { name: 'Credit' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('calls onValueChange and updates state on click in uncontrolled mode', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={['Preset', 'Single date', 'Range']}
        defaultValue="Preset"
        onValueChange={handleChange}
      />,
    );
    const rangeBtn = screen.getByRole('radio', { name: 'Range' });

    fireEvent.click(rangeBtn);
    expect(handleChange).toHaveBeenCalledWith('Range');
    expect(rangeBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('works in controlled mode', () => {
    const ControlledDemo = () => {
      const [val, setVal] = useState('List');
      return (
        <SegmentedControl
          options={['List', 'Calendar']}
          value={val}
          onValueChange={setVal}
        />
      );
    };

    render(<ControlledDemo />);
    const calendarBtn = screen.getByRole('radio', { name: 'Calendar' });
    expect(calendarBtn).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(calendarBtn);
    expect(calendarBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('navigates options via keyboard arrows', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={['Debit', 'Credit']}
        defaultValue="Debit"
        onValueChange={handleChange}
      />,
    );
    const debitBtn = screen.getByRole('radio', { name: 'Debit' });

    fireEvent.keyDown(debitBtn, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith('Credit');
    expect(screen.getByRole('radio', { name: 'Credit' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    const creditBtn = screen.getByRole('radio', { name: 'Credit' });
    fireEvent.keyDown(creditBtn, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith('Debit');
    expect(screen.getByRole('radio', { name: 'Debit' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('does not change selection when whole control is disabled', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        disabled
        options={['Debit', 'Credit']}
        defaultValue="Debit"
        onValueChange={handleChange}
      />,
    );
    const creditBtn = screen.getByRole('radio', { name: 'Credit' });

    fireEvent.click(creditBtn);
    expect(handleChange).not.toHaveBeenCalled();
    expect(creditBtn).toHaveAttribute('aria-checked', 'false');
  });

  it('does not allow selecting disabled option', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'archived', label: 'Archived', disabled: true },
        ]}
        defaultValue="all"
        onValueChange={handleChange}
      />,
    );
    const archivedBtn = screen.getByRole('radio', { name: 'Archived' });
    expect(archivedBtn).toBeDisabled();

    fireEvent.click(archivedBtn);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('preserves generic type in onValueChange', () => {
    type Mode = 'light' | 'dark';
    const handleChange = vi.fn((_val: Mode) => {});
    render(
      <SegmentedControl<Mode>
        options={['light', 'dark']}
        defaultValue="light"
        onValueChange={handleChange}
      />,
    );
    const darkBtn = screen.getByRole('radio', { name: 'dark' });
    fireEvent.click(darkBtn);
    expect(handleChange).toHaveBeenCalledWith('dark');
  });

  it('does not apply hover classes on a disabled option', () => {
    render(
      <SegmentedControl
        options={[
          { value: 'active', label: 'Active' },
          { value: 'archived', label: 'Archived', disabled: true },
        ]}
        defaultValue="active"
      />,
    );
    const archivedBtn = screen.getByRole('radio', { name: 'Archived' });
    expect(archivedBtn).toHaveClass('text-ink-faint');
    expect(archivedBtn).not.toHaveClass('hover:text-ink');
    expect(archivedBtn).not.toHaveClass('hover:bg-hover');
  });

  it('skips disabled options on arrow key navigation', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={[
          { value: 'first', label: 'First' },
          { value: 'second', label: 'Second', disabled: true },
          { value: 'third', label: 'Third' },
        ]}
        defaultValue="first"
        onValueChange={handleChange}
      />,
    );
    const firstBtn = screen.getByRole('radio', { name: 'First' });
    fireEvent.keyDown(firstBtn, { key: 'ArrowRight' });

    expect(handleChange).toHaveBeenCalledWith('third');
    expect(screen.getByRole('radio', { name: 'Third' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    const thirdBtn = screen.getByRole('radio', { name: 'Third' });
    fireEvent.keyDown(thirdBtn, { key: 'ArrowLeft' });

    expect(handleChange).toHaveBeenCalledWith('first');
    expect(screen.getByRole('radio', { name: 'First' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('skips disabled options on ArrowDown navigation (same as Right)', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={[
          { value: 'first', label: 'First' },
          { value: 'second', label: 'Second', disabled: true },
          { value: 'third', label: 'Third' },
        ]}
        defaultValue="first"
        onValueChange={handleChange}
      />,
    );
    const firstBtn = screen.getByRole('radio', { name: 'First' });
    fireEvent.keyDown(firstBtn, { key: 'ArrowDown' });

    expect(handleChange).toHaveBeenCalledWith('third');
    expect(screen.getByRole('radio', { name: 'Third' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('skips disabled options on ArrowUp navigation (same as Left)', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={[
          { value: 'first', label: 'First' },
          { value: 'second', label: 'Second', disabled: true },
          { value: 'third', label: 'Third' },
        ]}
        defaultValue="third"
        onValueChange={handleChange}
      />,
    );
    const thirdBtn = screen.getByRole('radio', { name: 'Third' });
    fireEvent.keyDown(thirdBtn, { key: 'ArrowUp' });

    expect(handleChange).toHaveBeenCalledWith('first');
    expect(screen.getByRole('radio', { name: 'First' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('does nothing and does not throw on arrow keys when every option is disabled', () => {
    const handleChange = vi.fn();
    render(
      <SegmentedControl
        options={[
          { value: 'first', label: 'First', disabled: true },
          { value: 'second', label: 'Second', disabled: true },
          { value: 'third', label: 'Third', disabled: true },
        ]}
        defaultValue="first"
        onValueChange={handleChange}
      />,
    );
    const firstBtn = screen.getByRole('radio', { name: 'First' });
    const secondBtn = screen.getByRole('radio', { name: 'Second' });
    const thirdBtn = screen.getByRole('radio', { name: 'Third' });

    expect(firstBtn).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(firstBtn, { key: 'ArrowRight' });
    fireEvent.keyDown(firstBtn, { key: 'ArrowDown' });
    fireEvent.keyDown(firstBtn, { key: 'ArrowLeft' });
    fireEvent.keyDown(firstBtn, { key: 'ArrowUp' });

    expect(handleChange).not.toHaveBeenCalled();
    expect(firstBtn).toHaveAttribute('aria-checked', 'true');
    expect(secondBtn).toHaveAttribute('aria-checked', 'false');
    expect(thirdBtn).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps control-md height by default and for md and lg', () => {
    const { rerender } = render(<SegmentedControl options={['Debit', 'Credit']} />);
    expect(screen.getByRole('radio', { name: 'Debit' })).toHaveClass('h-control-md');
    rerender(<SegmentedControl options={['Debit', 'Credit']} size="lg" />);
    expect(screen.getByRole('radio', { name: 'Debit' })).toHaveClass('h-control-md');
  });

  it('size sm is compact: control-sm height and tighter padding', () => {
    render(<SegmentedControl options={['All', 'Debit']} size="sm" />);
    const btn = screen.getByRole('radio', { name: 'Debit' });
    expect(btn).toHaveClass('h-control-sm', 'px-space-8', 'text-label');
    expect(btn).not.toHaveClass('h-control-md');
    expect(btn).not.toHaveClass('px-space-12');
  });

  it('size xl uses control-xl like TextField', () => {
    render(<SegmentedControl options={['Debit', 'Credit']} size="xl" />);
    const btn = screen.getByRole('radio', { name: 'Credit' });
    expect(btn).toHaveClass('h-control-xl');
    expect(btn).not.toHaveClass('h-control-md');
  });

  describe('sliding thumb', () => {
    const positions: Record<string, [number, number]> = { Debit: [0, 70], Credit: [70, 80] };

    it('follows the selected option', () => {
      const restore = mockLayout(positions);
      const { container, rerender } = render(
        <SegmentedControl options={['Debit', 'Credit']} value="Debit" />,
      );
      const thumb = () => container.querySelector<HTMLElement>('[data-segmented-thumb]');
      expect(thumb()?.style.width).toBe('70px');
      expect(thumb()?.style.transform).toBe('translateX(0px)');
      rerender(<SegmentedControl options={['Debit', 'Credit']} value="Credit" />);
      expect(thumb()?.style.width).toBe('80px');
      expect(thumb()?.style.transform).toBe('translateX(70px)');
      restore();
    });

    it('renders without a thumb and without ResizeObserver when nothing is selected', () => {
      const original = globalThis.ResizeObserver;
      // @ts-expect-error simulate an environment without ResizeObserver
      delete globalThis.ResizeObserver;
      const { container } = render(<SegmentedControl options={['Debit', 'Credit']} />);
      expect(container.querySelector('[data-segmented-thumb]')).toBeNull();
      globalThis.ResizeObserver = original;
    });
  });
});
