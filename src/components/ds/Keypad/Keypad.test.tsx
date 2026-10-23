import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { applyKeypadKey, Keypad } from './Keypad';

const operators = [
  { value: '÷' },
  { value: '×' },
  { value: '-', label: '−' },
  { value: '+' },
];

const tap = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const tapKey = (container: HTMLElement, key: string) =>
  fireEvent.click(container.querySelector(`[data-keypad-key="${key}"]`) as HTMLElement);

describe('applyKeypadKey', () => {
  it('appends digits and replaces a lone zero', () => {
    expect(applyKeypadKey('12', '3')).toBe('123');
    expect(applyKeypadKey('0', '5')).toBe('5');
    expect(applyKeypadKey('10', '0')).toBe('100');
  });

  it('allows one decimal point per number and starts 0. on empty', () => {
    expect(applyKeypadKey('', '.')).toBe('0.');
    expect(applyKeypadKey('1.5', '.')).toBe('1.5');
    expect(applyKeypadKey('1.5+2', '.', operators)).toBe('1.5+2.');
    expect(applyKeypadKey('1+', '.', operators)).toBe('1+0.');
  });

  it('operators need text before them and replace a trailing operator', () => {
    expect(applyKeypadKey('', '+', operators)).toBe('');
    expect(applyKeypadKey('5+', '×', operators)).toBe('5×');
    expect(applyKeypadKey('5', '-', operators)).toBe('5-');
  });

  it('backspace removes the last character and is safe on empty text', () => {
    expect(applyKeypadKey('12+', 'backspace')).toBe('12');
    expect(applyKeypadKey('', 'backspace')).toBe('');
  });
});

describe('Keypad', () => {
  it('shows 12 keys, three columns without operators', () => {
    const { container } = render(<Keypad />);
    expect(screen.getAllByRole('button')).toHaveLength(12);
    expect(container.firstElementChild?.className).toContain('grid-cols-3');
  });

  it('adds a fourth column of operator keys with their labels', () => {
    const { container } = render(<Keypad operators={operators} />);
    expect(screen.getAllByRole('button')).toHaveLength(16);
    expect(container.firstElementChild?.className).toContain('grid-cols-4');
    expect(screen.getByRole('button', { name: '−' })).toBeInTheDocument();
  });

  it('uncontrolled: builds the text and reports each change', () => {
    const onValueChange = vi.fn();
    const { container } = render(<Keypad operators={operators} onValueChange={onValueChange} />);
    tapKey(container, '1');
    tapKey(container, '2');
    tapKey(container, '0');
    tapKey(container, '+');
    expect(onValueChange).toHaveBeenLastCalledWith('120+');
    tap('Backspace');
    expect(onValueChange).toHaveBeenLastCalledWith('120');
  });

  it('controlled: shows the page text and does not change by itself', () => {
    const onValueChange = vi.fn();
    const { container } = render(<Keypad value="7" onValueChange={onValueChange} />);
    tapKey(container, '8');
    expect(onValueChange).toHaveBeenCalledWith('78');
    function Harness() {
      const [v, setV] = useState('');
      return (
        <>
          <output data-testid="out">{v}</output>
          <Keypad value={v} onValueChange={setV} />
        </>
      );
    }
    const h = render(<Harness />);
    tapKey(h.container, '4');
    expect(screen.getByTestId('out')).toHaveTextContent('4');
  });

  it('names the backspace key from backspaceLabel', () => {
    render(<Keypad backspaceLabel="Delete" />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});
