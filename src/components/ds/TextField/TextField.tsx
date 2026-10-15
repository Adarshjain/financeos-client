import { Calendar, Lock } from 'lucide-react';
import React, { forwardRef, useId, useState } from 'react';

import { cn } from '../cn';

export interface TextFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'prefix' | 'size' | 'ref' | 'onChange'
  > {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  locked?: boolean;
  mode?: 'text' | 'date';
  date?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
  onChange?: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
}

export interface ReadOnlyRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
}

export const ReadOnlyRow = forwardRef<HTMLDivElement, ReadOnlyRowProps>(
  ({ label, value, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-space-12 py-space-8 font-text text-body border-t border-line-soft first:border-t-0',
          className,
        )}
        {...props}
      >
        <span className="text-ink-3">{label}</span>
        <span className="text-ink font-semibold text-right">{value}</span>
      </div>
    );
  },
);

ReadOnlyRow.displayName = 'ReadOnlyRow';

function formatDateInput(val: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
  }
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export const TextField = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  TextFieldProps
>(
  (
    {
      id: explicitId,
      label,
      helper,
      error,
      optional = false,
      locked = false,
      disabled = false,
      mode = 'text',
      date = false,
      prefix,
      suffix,
      multiline = false,
      rows = 3,
      type = 'text',
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
    const [showPassword, setShowPassword] = useState(false);

    const isDateMode = mode === 'date' || date || type === 'date';
    const isPassword = type === 'password';
    const computedType = isPassword && showPassword ? 'text' : isDateMode ? 'text' : type;
    const computedPlaceholder = placeholder ?? (isDateMode ? 'dd/mm/yyyy' : undefined);
    const renderedSuffix =
      suffix ??
      (isDateMode ? (
        <Calendar className="h-space-14 w-space-14 text-ink-3 shrink-0" aria-hidden="true" />
      ) : null);

    const hasError = Boolean(error);
    const isLocked = Boolean(locked);

    const formattedDefaultValue =
      isDateMode && typeof defaultValue === 'string'
        ? formatDateInput(defaultValue)
        : defaultValue;

    const formattedValue =
      isDateMode && typeof value === 'string'
        ? formatDateInput(value)
        : value;

    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      if (isDateMode && !multiline) {
        e.target.value = formatDateInput(e.target.value);
      }
      onChange?.(e);
    };

    return (
      <div className={cn('w-full font-text text-body', className)}>
        {label ? (
          <label
            htmlFor={id}
            className="block font-text font-bold text-label text-ink-2 mb-space-6 select-none"
          >
            {label}
            {optional ? (
              <span className="font-medium text-ink-4 ml-space-4">
                (Optional)
              </span>
            ) : null}
          </label>
        ) : null}

        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={id}
            rows={rows}
            disabled={disabled}
            readOnly={isLocked || props.readOnly}
            placeholder={placeholder}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            className={cn(
              'w-full p-space-12 rounded-ds-md border bg-surface font-text font-medium text-body text-ink placeholder:text-ink-4',
              'transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2',
              hasError
                ? 'border-danger focus:ring-danger'
                : 'border-line-strong focus:border-brand',
              isLocked && 'bg-sunken text-ink-3',
              disabled && 'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
            )}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <div
            className={cn(
              'flex items-center gap-space-8 h-control-lg w-full px-space-12 border rounded-ds-md bg-surface font-text font-medium text-body text-ink',
              'transition-colors duration-fast focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2',
              hasError
                ? 'border-danger focus-within:ring-danger'
                : 'border-line-strong focus-within:border-brand',
              isLocked && 'bg-sunken text-ink-3',
              disabled && 'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
            )}
          >
            {isLocked ? (
              <Lock className="h-space-14 w-space-14 text-ink-3 shrink-0" aria-hidden="true" />
            ) : null}

            {prefix ? (
              <span className="text-ink-3 font-semibold text-body select-none shrink-0">
                {prefix}
              </span>
            ) : null}

            <input
              ref={ref as React.Ref<HTMLInputElement>}
              id={id}
              type={computedType}
              inputMode={isDateMode ? 'numeric' : props.inputMode}
              disabled={disabled}
              readOnly={isLocked || props.readOnly}
              placeholder={computedPlaceholder}
              value={formattedValue}
              defaultValue={formattedDefaultValue}
              onChange={handleChange}
              className="w-full h-full bg-transparent border-0 p-0 text-body text-ink placeholder:text-ink-4 focus:outline-none focus:ring-0"
              {...props}
            />

            {isPassword ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="ml-auto text-label font-bold text-brand hover:text-brand-strong cursor-pointer focus-visible:outline-none shrink-0"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            ) : null}

            {renderedSuffix ? (
              <span className="ml-auto shrink-0 flex items-center text-ink-4">
                {renderedSuffix}
              </span>
            ) : null}
          </div>
        )}

        {hasError ? (
          <div className="mt-space-6 font-text font-medium text-caption text-danger">
            {error}
          </div>
        ) : helper ? (
          <div className="mt-space-6 font-text font-medium text-caption text-ink-3">
            {helper}
          </div>
        ) : null}
      </div>
    );
  },
);

TextField.displayName = 'TextField';
