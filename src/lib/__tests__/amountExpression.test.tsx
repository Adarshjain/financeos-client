import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TextField } from '@/components/ds';

import {
  amountExpressionProps,
  amountExpressionValue,
  evaluateAmountExpression as ev,
  hasAmountOperator,
  resolveAmountExpression,
  sanitizeAmountExpressionInput,
} from '../amountExpression';

describe('evaluateAmountExpression', () => {
  it('adds, subtracts, multiplies and divides', () => {
    expect(ev('120+45')).toBe(165);
    expect(ev('200-35')).toBe(165);
    expect(ev('12*5')).toBe(60);
    expect(ev('90/4')).toBe(22.5);
  });

  it('reads × and ÷ as multiply and divide', () => {
    expect(ev('12×5')).toBe(60);
    expect(ev('90÷4')).toBe(22.5);
  });

  it('follows standard precedence', () => {
    expect(ev('2+3*4')).toBe(14);
    expect(ev('10-6/2')).toBe(7);
    expect(ev('10-4-3')).toBe(3);
    expect(ev('100/10/5')).toBe(2);
  });

  it('honours parentheses, nested too', () => {
    expect(ev('(2+3)*4')).toBe(20);
    expect(ev('2*(3+(4-1))')).toBe(12);
  });

  it('accepts unary minus and plus', () => {
    expect(ev('-5+8')).toBe(3);
    expect(ev('5*-2')).toBe(-10);
    expect(ev('(-3+5)')).toBe(2);
    expect(ev('--4')).toBe(4);
    expect(ev('+7')).toBe(7);
  });

  it('accepts decimals and grouping commas, Indian or standard', () => {
    expect(ev('1.5+2.25')).toBe(3.75);
    expect(ev('.5+.5')).toBe(1);
    expect(ev('1,00,000+5,000')).toBe(105000);
    expect(ev('1,000,000/4')).toBe(250000);
  });

  it('ignores spaces', () => {
    expect(ev(' 120 + 45 ')).toBe(165);
  });

  it('rounds to 2 decimals', () => {
    expect(ev('10/3')).toBe(3.33);
    expect(ev('2/3')).toBe(0.67);
    expect(ev('0.1+0.2')).toBe(0.3);
    expect(ev('1.005*1')).toBe(1.01);
  });

  it('returns null for empty or invalid input', () => {
    for (const bad of ['', '   ', '+', '1+', '*3', '(1+2', '1+2)', '()', '1..2+1', '1.2.3+1', 'abc', '1+a', '2 3', '1++', '1**2']) {
      expect(ev(bad), bad).toBeNull();
    }
  });

  it('returns null for divide by zero', () => {
    expect(ev('5/0')).toBeNull();
    expect(ev('5/(2-2)')).toBeNull();
    expect(ev('1+5÷0')).toBeNull();
  });

  it('never evaluates code', () => {
    expect(ev('alert(1)')).toBeNull();
    expect(ev('1;2')).toBeNull();
  });
});

describe('resolveAmountExpression', () => {
  it('turns an expression into its result', () => {
    expect(resolveAmountExpression('120+45')).toBe('165');
    expect(resolveAmountExpression('10/4')).toBe('2.5');
  });

  it('leaves a plain number exactly as typed', () => {
    for (const plain of ['165', '165.50', '0.10', '007', '.5', '1.', '', '1,000']) {
      expect(resolveAmountExpression(plain)).toBe(plain);
    }
  });

  it('leaves an expression that does not evaluate so validation can speak', () => {
    expect(resolveAmountExpression('5/0')).toBe('5/0');
    expect(resolveAmountExpression('120+')).toBe('120+');
  });

  it('leaves a negative result unless negatives are allowed', () => {
    expect(resolveAmountExpression('10-30')).toBe('10-30');
    expect(resolveAmountExpression('10-30', { allowNegative: true })).toBe('-20');
  });
});

describe('hasAmountOperator', () => {
  it('spots operators and parentheses only', () => {
    expect(hasAmountOperator('1+1')).toBe(true);
    expect(hasAmountOperator('(5)')).toBe(true);
    expect(hasAmountOperator('12.50')).toBe(false);
  });
});

describe('sanitizeAmountExpressionInput', () => {
  it('keeps digits, dot and the operators; drops everything else', () => {
    expect(sanitizeAmountExpressionInput('1,20 + 4a5')).toBe('120+45');
    expect(sanitizeAmountExpressionInput('(12×3)÷4*5/6-7')).toBe('(12×3)÷4*5/6-7');
  });

  it('drops a leading minus so a plain amount stays positive', () => {
    expect(sanitizeAmountExpressionInput('-50')).toBe('50');
    expect(sanitizeAmountExpressionInput('5*-2')).toBe('5*-2');
  });

  it('keeps a plain number to one decimal point', () => {
    expect(sanitizeAmountExpressionInput('1.2.3')).toBe('1.23');
  });
});

describe('amountExpressionProps', () => {
  function Field({ onEdit }: { onEdit?: () => void }) {
    const [value, setValue] = React.useState('');
    return <TextField aria-label="Amount" value={value} {...amountExpressionProps(value, setValue, onEdit)} />;
  }

  it('filters typing, then resolves the arithmetic on blur', () => {
    const onEdit = vi.fn();
    render(<Field onEdit={onEdit} />);
    const input = screen.getByLabelText('Amount');
    fireEvent.change(input, { target: { value: '120+4x5' } });
    expect(input).toHaveValue('120+45');
    expect(onEdit).toHaveBeenCalled();
    fireEvent.blur(input);
    expect(input).toHaveValue('165');
  });

  it('leaves an unresolvable value and a plain number alone on blur', () => {
    render(<Field />);
    const input = screen.getByLabelText('Amount');
    fireEvent.change(input, { target: { value: '5/0' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('5/0');
    fireEvent.change(input, { target: { value: '12.50' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('12.50');
  });
});

describe('amountExpressionValue', () => {
  it('evaluates expressions and plain numbers to a finite number', () => {
    expect(amountExpressionValue('120+45')).toBe(165);
    expect(amountExpressionValue(' 1200.5 ')).toBe(1200.5);
    expect(amountExpressionValue('0')).toBe(0);
  });

  it('is null for blank, invalid or division by zero text', () => {
    for (const bad of ['', '  ', '5+', '100/0', '1.2.3', '.', '(2+3']) expect(amountExpressionValue(bad)).toBeNull();
  });

  it('is null for a negative result unless negatives are allowed', () => {
    expect(amountExpressionValue('100-200')).toBeNull();
    expect(amountExpressionValue('100-200', { allowNegative: true })).toBe(-100);
  });
});
