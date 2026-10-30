import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConcealProvider } from '@/components/ds/Conceal/Conceal';
import { amountExpressionProps } from '@/lib/amountExpression';

import { AmountField } from './AmountField';

function mockLayout(phone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('min-width') ? !phone : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  }));
}

function Harness({ initial = '', onNegative }: { initial?: string; onNegative?: () => void }) {
  const [amount, setAmount] = useState(initial);
  return (
    <>
      <AmountField
        aria-label="Amount"
        inputMode="decimal"
        value={amount}
        {...amountExpressionProps(amount, setAmount)}
        onNegative={onNegative}
      />
      <output data-testid="stored">{amount}</output>
    </>
  );
}

const keypad = () => within(screen.getByRole('dialog'));
const press = (...keys: string[]) =>
  keys.forEach((k) =>
    fireEvent.click(
      screen.getByRole('dialog').querySelector(`[data-keypad-key="${k}"]`) as HTMLElement,
    ),
  );

afterEach(() => {
  // @ts-expect-error restore jsdom default (no matchMedia)
  delete window.matchMedia;
});

describe('AmountField on phone', () => {
  it('tapping opens the keypad sheet and does not focus the input', () => {
    mockLayout(true);
    render(<Harness />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect(fireEvent.mouseDown(input)).toBe(false);
    fireEvent.click(input);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.activeElement).not.toBe(input);
  });

  it('a label tap (focus, then click) opens the keypad and drops the focus', () => {
    mockLayout(true);
    render(<Harness />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    act(() => input.focus());
    fireEvent.click(input);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.activeElement).not.toBe(input);
  });

  it('programmatic focus (a dialog opening) does not pop the keypad', () => {
    mockLayout(true);
    render(<Harness />);
    act(() => screen.getByRole('textbox', { name: 'Amount' }).focus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closing the sheet does not reopen it', () => {
    mockLayout(true);
    render(<Harness />);
    fireEvent.click(screen.getByRole('textbox', { name: 'Amount' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('never masks what is typed or its result while amounts are hidden', () => {
    mockLayout(true);
    render(
      <ConcealProvider concealed>
        <Harness />
      </ConcealProvider>,
    );
    fireEvent.click(screen.getByRole('textbox'));
    press('1', '0', '0', '+', '5', '0');
    expect(screen.getByTestId('amount-keypad-display')).toHaveTextContent('₹100+50');
    expect(screen.getByTestId('amount-keypad-result')).toHaveTextContent('= ₹150');
  });

  it('shows a live result line for arithmetic and Apply fills the resolved value', () => {
    mockLayout(true);
    render(<Harness />);
    fireEvent.click(screen.getByRole('textbox'));
    press('1', '2', '0', '+', '8', '0');
    expect(screen.getByTestId('amount-keypad-display')).toHaveTextContent('₹120+80');
    expect(screen.getByTestId('amount-keypad-result')).toHaveTextContent('= ₹200');
    fireEvent.click(keypad().getByRole('button', { name: 'Apply' }));
    expect(screen.getByTestId('stored')).toHaveTextContent('200');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses Indian grouping in the result', () => {
    mockLayout(true);
    render(<Harness />);
    fireEvent.click(screen.getByRole('textbox'));
    press('1', '2', '0', '0', '0', '0', '0', '+', '1');
    expect(screen.getByTestId('amount-keypad-result')).toHaveTextContent('= ₹12,00,001');
  });

  it('shows no result line without an operator', () => {
    mockLayout(true);
    render(<Harness />);
    fireEvent.click(screen.getByRole('textbox'));
    press('4', '5');
    expect(screen.getByTestId('amount-keypad-result')).not.toHaveTextContent('=');
  });

  it('starts from the current field value and backspace edits it', () => {
    mockLayout(true);
    render(<Harness initial="250" />);
    fireEvent.click(screen.getByRole('textbox'));
    expect(screen.getByTestId('amount-keypad-display')).toHaveTextContent('₹250');
    press('backspace', '9');
    fireEvent.click(keypad().getByRole('button', { name: 'Apply' }));
    expect(screen.getByTestId('stored')).toHaveTextContent('259');
  });

  it('disables Apply for an invalid or negative expression', () => {
    mockLayout(true);
    render(<Harness />);
    fireEvent.click(screen.getByRole('textbox'));
    press('5', '+');
    expect(keypad().getByRole('button', { name: 'Apply' })).toBeDisabled();
    press('backspace', '-', '9');
    expect(keypad().getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('with onNegative, a negative result applies without its sign and calls it', () => {
    mockLayout(true);
    const onNegative = vi.fn();
    render(<Harness initial="500" onNegative={onNegative} />);
    fireEvent.click(screen.getByRole('textbox'));
    press('-', '7', '0', '0');
    expect(screen.getByTestId('amount-keypad-result')).toHaveTextContent('= −₹200');
    fireEvent.click(keypad().getByRole('button', { name: 'Apply' }));
    expect(screen.getByTestId('stored')).toHaveTextContent('200');
    expect(onNegative).toHaveBeenCalledTimes(1);
  });

  it('a positive result never calls onNegative', () => {
    mockLayout(true);
    const onNegative = vi.fn();
    render(<Harness initial="500" onNegative={onNegative} />);
    fireEvent.click(screen.getByRole('textbox'));
    press('-', '2', '0', '0');
    fireEvent.click(keypad().getByRole('button', { name: 'Apply' }));
    expect(screen.getByTestId('stored')).toHaveTextContent('300');
    expect(onNegative).not.toHaveBeenCalled();
  });

  it('dismissing the sheet leaves the field unchanged', () => {
    mockLayout(true);
    render(<Harness initial="250" />);
    fireEvent.click(screen.getByRole('textbox'));
    press('9');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('stored')).toHaveTextContent('250');
  });
});

describe('AmountField on desktop', () => {
  it('stays a normal input: no sheet, typing and calculator expressions work', () => {
    mockLayout(false);
    render(<Harness />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect(fireEvent.mouseDown(input)).toBe(true);
    fireEvent.click(input);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: '120+45' } });
    expect(screen.getByTestId('stored')).toHaveTextContent('120+45');
    fireEvent.blur(input);
    expect(screen.getByTestId('stored')).toHaveTextContent('165');
  });

  it('with onNegative, typed arithmetic that comes out negative loses its sign on blur', () => {
    mockLayout(false);
    const onNegative = vi.fn();
    render(<Harness onNegative={onNegative} />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    fireEvent.change(input, { target: { value: '100-350' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('stored')).toHaveTextContent('250');
    expect(onNegative).toHaveBeenCalledTimes(1);
  });

  it('without onNegative, typed negative arithmetic stays as typed', () => {
    mockLayout(false);
    render(<Harness />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    fireEvent.change(input, { target: { value: '100-350' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('stored')).toHaveTextContent('100-350');
  });

  it('focus does not open a sheet', () => {
    mockLayout(false);
    render(<Harness />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    act(() => input.focus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });
});
