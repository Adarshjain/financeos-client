'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react';

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
      rows = 3,
      minRows = 3,
      maxRows = 8,
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
    const hasError = Boolean(error);

    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    const combinedRef = useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }
      },
      [ref],
    );

    const adjustHeight = useCallback(() => {
      const textarea = internalRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      const lineHeight = 20;
      const paddingBorder = 26;
      const minHeight = minRows * lineHeight + paddingBorder;
      const maxHeight = maxRows * lineHeight + paddingBorder;
      const scrollHeight = textarea.scrollHeight;
      const nextHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, [minRows, maxRows]);

    useEffect(() => {
      adjustHeight();
    }, [adjustHeight, value, defaultValue]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onChange?.(e);
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
          ref={combinedRef}
          id={id}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={hasError || helper ? helperId : undefined}
          className={cn(
            'w-full p-space-12 rounded-ds-md border bg-surface font-text font-medium text-body text-ink placeholder:text-ink-4 resize-none',
            'transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2',
            hasError
              ? 'border-danger focus:ring-danger'
              : 'border-line-strong focus:border-brand',
            disabled &&
              'bg-sunken text-ink-faint border-line cursor-not-allowed opacity-60',
          )}
          {...props}
        />
      </FieldFrame>
    );
  },
);

TextArea.displayName = 'TextArea';
