'use client';

import React, { forwardRef, useId, useState } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { FieldFrame } from '../FieldFrame';

export type TextFieldKind = 'text' | 'number' | 'email' | 'amount' | 'password';

export interface TextFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'prefix' | 'size' | 'ref'
  > {
  kind?: TextFieldKind;
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      id: explicitId,
      kind,
      type = 'text',
      label,
      helper,
      error,
      optional = false,
      disabled = false,
      prefix,
      suffix,
      className,
      placeholder,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId ?? generatedId;
    const helperId = `${id}-helper`;
    const [showPassword, setShowPassword] = useState(false);

    const resolvedKind: TextFieldKind =
      kind ??
      (type === 'password'
        ? 'password'
        : type === 'number'
          ? 'number'
          : type === 'email'
            ? 'email'
            : 'text');

    const isPassword = resolvedKind === 'password';
    const computedType = isPassword && showPassword ? 'text' : isPassword ? 'password' : type;

    const hasError = Boolean(error);
    const resolvedPrefix = prefix ?? (resolvedKind === 'amount' ? '₹' : null);

    return (
      <FieldFrame
        id={id}
        helperId={helperId}
        label={label}
        optional={optional}
        helper={helper}
        error={error}
        className={className}
      >
        <div
          className={cn(
            'flex items-center gap-space-8 h-control-lg w-full px-space-12 border rounded-ds-md bg-surface font-text font-medium text-body text-ink',
            'transition-colors duration-fast focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2',
            hasError
              ? 'border-danger focus-within:ring-danger'
              : 'border-line-strong focus-within:border-brand',
            disabled &&
              'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
          )}
        >
          {resolvedPrefix ? (
            <span className="text-ink-3 font-semibold text-body select-none shrink-0">
              {resolvedPrefix}
            </span>
          ) : null}

          <input
            ref={ref}
            id={id}
            type={computedType}
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={hasError || helper ? helperId : undefined}
            className={cn(
              'w-full h-full bg-transparent border-0 p-0 text-body text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0',
              resolvedKind === 'amount' && 'tabular-nums',
              disabled && 'cursor-not-allowed text-ink-faint',
            )}
            {...props}
          />

          {isPassword ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="ml-auto text-label font-bold text-ink-2 hover:text-ink shrink-0 h-auto py-0 px-space-4"
            >
              {showPassword ? 'Hide' : 'Show'}
            </Button>
          ) : null}

          {suffix ? (
            <span className="ml-auto shrink-0 flex items-center text-ink-4">
              {suffix}
            </span>
          ) : null}
        </div>
      </FieldFrame>
    );
  },
);

TextField.displayName = 'TextField';
