'use client';

import React, { forwardRef, useState } from 'react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  Keypad,
  Text,
  TextField,
  type TextFieldProps,
} from '@/components/ds';
import { isPhoneLayout } from '@/components/ds/phoneLayout';
import { evaluateAmountExpression, hasAmountOperator } from '@/lib/amountExpression';

const OPERATORS = [
  { value: '÷' },
  { value: '×' },
  { value: '-', label: '−' },
  { value: '+' },
];

function formatResult(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/**
 * An amount TextField. On desktop it is a plain text input (type, or type arithmetic like
 * 120+80). On phone, tapping it never opens the OS keyboard: a second sheet opens over the form
 * with a big amount, the number keypad and Apply. Apply puts the resolved value in the field;
 * dismissing the sheet leaves the field as it was. Takes TextField's props; pair it with
 * `amountExpressionProps` like any amount field.
 */
export type AmountFieldProps = TextFieldProps & {
  /**
   * Accepts a negative result: the field gets the amount without its sign and this is called
   * (the transaction form switches to debit). Without it a negative result can't be applied.
   */
  onNegative?: () => void;
};

export const AmountField = forwardRef<HTMLInputElement, AmountFieldProps>(
  ({ onMouseDown, onClick, onBlur, onNegative, ...props }, ref) => {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState('');

    const openKeypad = () => {
      setDraft(String(props.value ?? ''));
      setOpen(true);
    };

    const hasOperator = hasAmountOperator(draft);
    const result = draft.trim() ? evaluateAmountExpression(draft) : null;
    const valid = !draft.trim() || (result !== null && (result >= 0 || !!onNegative));

    /** Puts a resolved amount in the field; a negative one loses its sign and calls onNegative. */
    const fill = (n: number) => {
      props.onValueChange?.(String(Math.abs(n)));
      if (n < 0) onNegative?.();
    };

    const apply = () => {
      if (!valid) return;
      if (result === null) props.onValueChange?.('');
      else fill(result);
      setOpen(false);
    };

    const title =
      typeof props.label === 'string' ? props.label : (props['aria-label'] ?? 'Amount');

    return (
      <>
        <TextField
          ref={ref}
          {...props}
          onMouseDown={(e) => {
            // Stops the input taking focus, so no OS keyboard on phone.
            if (isPhoneLayout()) e.preventDefault();
            onMouseDown?.(e);
          }}
          onClick={(e) => {
            if (isPhoneLayout()) {
              // A label tap focuses the input before this click: drop that focus.
              e.currentTarget.blur();
              openKeypad();
            }
            onClick?.(e);
          }}
          onBlur={(e) => {
            // Desktop: typed arithmetic that comes out negative is handled like the keypad's Apply.
            const typed = String(props.value ?? '');
            const n = onNegative && hasAmountOperator(typed) ? evaluateAmountExpression(typed) : null;
            if (n !== null && n < 0) fill(n);
            else onBlur?.(e);
          }}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            size="sm"
            title={title}
            onCloseAutoFocus={(e) => e.preventDefault()}
            primary={{ label: 'Apply', onSelect: apply, disabled: !valid }}
          >
            <DialogBody>
              <div className="flex flex-col items-end gap-space-4 py-space-8">
                <Text variant="hero-figure" as="p" data-testid="amount-keypad-display">
                  {/* "₹" and the number are separate children so Text's amount masking never matches. */}
                  ₹{draft.replace(/-/g, '−') || '0'}
                </Text>
                <Text variant="caption" tone="ink-3" as="p" data-testid="amount-keypad-result">
                  {hasOperator && result !== null ? <>= {result < 0 ? '−' : ''}₹{formatResult(Math.abs(result))}</> : ' '}
                </Text>
              </div>
              <Keypad value={draft} onValueChange={setDraft} operators={OPERATORS} />
            </DialogBody>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

AmountField.displayName = 'AmountField';
