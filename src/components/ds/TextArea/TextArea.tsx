'use client';

import React, { forwardRef, useId } from 'react';

import { cn } from '../cn';
import { FieldFrame } from '../FieldFrame';

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  minRows?: number;
  maxRows?: number;
  controlClassName?: string;
  onValueChange?: (value: string) => void;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      id: explicitId,
      label,
      helper,
      error,
      optional = false,
      disabled = false,
      rows = 1,
      minRows = 1,
      maxRows,
      className,
      controlClassName,
      placeholder,
      value,
      defaultValue,
      onChange,
      onValueChange,
      style,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId ?? generatedId;
    const helperId = `${id}-helper`;
    const hasError = Boolean(error);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);
    };

    const inlineStyles: React.CSSProperties & { fieldSizing?: string } = {
      fieldSizing: 'content',
      ...(minRows !== undefined && minRows > 1
        ? { minHeight: `calc(${minRows}lh + 18px)` }
        : {}),
      ...(maxRows !== undefined
        ? { maxHeight: `calc(${maxRows}lh + 18px)` }
        : {}),
      ...style,
    };

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
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={hasError || helper ? helperId : undefined}
          style={inlineStyles}
          className={cn(
            'w-full min-h-control-lg px-space-12 py-space-8 rounded-ds-md border bg-surface font-text font-medium text-body text-ink placeholder:text-ink-4 resize-y [field-sizing:content]',
            'transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2',
            hasError
              ? 'border-danger focus:ring-danger'
              : 'border-line-strong focus:border-brand',
            disabled &&
              'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
            controlClassName,
          )}
          {...props}
        />
      </FieldFrame>
    );
  },
);

TextArea.displayName = 'TextArea';


