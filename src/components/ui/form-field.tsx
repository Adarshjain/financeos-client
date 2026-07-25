import * as React from 'react';

import { cn } from '@/lib/utils';

import { Input } from './input';
import { Label } from './label';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function FormField({
                            label,
                            error,
                            hint,
                            id,
                            className,
                            ...props
                          }: FormFieldProps) {
  const fieldId = id || props.name;
  // The error/hint text was previously rendered with no programmatic link to
  // the input, so a screen reader announced neither that the field was invalid
  // nor why. Used by login, signup, CreateInvestmentForm, GmailConnect and
  // TransactionCRUD, so the fix applies across all of them.
  const errorId = fieldId ? `${fieldId}-error` : undefined;
  const hintId = fieldId ? `${fieldId}-hint` : undefined;
  const showHint = Boolean(hint) && !error;

  return (
    <div className={cn('space-y-1', className)}>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <Input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : showHint ? hintId : undefined}
        className={cn(
          error && 'border-red-300 dark:border-red-700 focus:ring-red-500',
        )}
        {...props}
      />
      {showHint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
