'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';
import { useControllableState } from '../useControllableState';

export interface KeypadOperator {
  /** The character appended to the value (and recognised as an operator). */
  value: string;
  /** What the key shows; defaults to `value`. */
  label?: string;
}

export interface KeypadProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  /** The text being built. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Operator keys, shown as a fourth column top to bottom. None = a three-column pad. */
  operators?: readonly KeypadOperator[];
  /** Accessible name of the backspace key. */
  backspaceLabel?: string;
}

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

const TRAILING_NUMBER = /[0-9.]*$/;

/** Applies one key press to the text: pure, so tests and callers can rely on it. */
export function applyKeypadKey(
  value: string,
  key: string,
  operators: readonly KeypadOperator[] = [],
): string {
  const isOperator = operators.some((op) => op.value === key);
  const last = value.slice(-1);
  if (key === 'backspace') return value.slice(0, -1);
  if (isOperator) {
    if (value === '') return value;
    return operators.some((op) => op.value === last) ? value.slice(0, -1) + key : value + key;
  }
  const current = value.match(TRAILING_NUMBER)?.[0] ?? '';
  if (key === '.') {
    if (current.includes('.')) return value;
    return current === '' ? `${value}0.` : `${value}.`;
  }
  if (current === '0') return value.slice(0, -1) + key;
  return value + key;
}

/**
 * A number pad that builds text: digits, a decimal point, backspace and optional operator
 * keys. It knows nothing about money; the page decides what the text means.
 */
export const Keypad = forwardRef<HTMLDivElement, KeypadProps>(
  (
    {
      value: controlledValue,
      defaultValue,
      onValueChange,
      operators = [],
      backspaceLabel = 'Backspace',
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState<string>({
      value: controlledValue,
      defaultValue: defaultValue ?? '',
      onChange: onValueChange,
    });
    const press = (key: string) => setValue(applyKeypadKey(value, key, operators));

    const key = (id: string, content: React.ReactNode, label?: string) => (
      <Button
        key={id}
        type="button"
        variant="secondary"
        size="xl"
        fullWidth
        aria-label={label}
        data-keypad-key={id}
        onClick={() => press(id)}
      >
        {content}
      </Button>
    );
    const text = (content: string) => (
      <Text variant="title" as="span">
        {content}
      </Text>
    );

    const lastRow = [
      key('.', text('.'), 'Decimal point'),
      key('0', text('0')),
      key('backspace', <Icon name="backspace" size="lg" />, backspaceLabel),
    ];

    return (
      <div
        ref={ref}
        className={cn(
          'grid gap-space-8',
          operators.length > 0 ? 'grid-cols-4' : 'grid-cols-3',
          className,
        )}
        {...props}
      >
        {[...DIGIT_ROWS.map((row) => row.map((d) => key(d, text(d)))), lastRow].map(
          (cells, rowIndex) => (
            <React.Fragment key={rowIndex}>
              {cells}
              {operators[rowIndex]
                ? key(
                    operators[rowIndex].value,
                    text(operators[rowIndex].label ?? operators[rowIndex].value),
                    operators[rowIndex].label,
                  )
                : null}
            </React.Fragment>
          ),
        )}
      </div>
    );
  },
);

Keypad.displayName = 'Keypad';
