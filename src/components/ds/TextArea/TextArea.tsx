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
      maxRows = 8,
      className,
      controlClassName,
      placeholder,
      value,
      defaultValue,
      onChange,
      onValueChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId ?? generatedId;
    const helperId = `${id}-helper`;
    const hasError = Boolean(error);

    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const userResizedRef = useRef(false);
    const isAutoAdjustingRef = useRef(false);

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
      if (!textarea || userResizedRef.current) return;

      isAutoAdjustingRef.current = true;
      textarea.style.height = 'auto';

      let lineHeight = 18;
      let paddingBorder = 18;

      if (typeof window !== 'undefined') {
        const cs = window.getComputedStyle(textarea);
        const parsedLine = parseFloat(cs.lineHeight);
        if (!isNaN(parsedLine) && parsedLine > 0) {
          lineHeight = parsedLine;
        }
        const paddingTop = parseFloat(cs.paddingTop) || 8;
        const paddingBottom = parseFloat(cs.paddingBottom) || 8;
        const borderTop = parseFloat(cs.borderTopWidth) || 1;
        const borderBottom = parseFloat(cs.borderBottomWidth) || 1;
        paddingBorder = paddingTop + paddingBottom + borderTop + borderBottom;
      }

      const minHeight = minRows * lineHeight + paddingBorder;
      const maxHeight = maxRows * lineHeight + paddingBorder;

      const scrollHeight = textarea.scrollHeight;
      const nextHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);

      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
      isAutoAdjustingRef.current = false;
    }, [minRows, maxRows]);

    useEffect(() => {
      const textarea = internalRef.current;
      if (!textarea || typeof ResizeObserver === 'undefined') return;

      let prevHeight = textarea.offsetHeight;
      const observer = new ResizeObserver(() => {
        const currentHeight = textarea.offsetHeight;
        if (isAutoAdjustingRef.current) return;
        if (currentHeight > 0 && prevHeight > 0 && Math.abs(currentHeight - prevHeight) > 2) {
          userResizedRef.current = true;
        }
        prevHeight = currentHeight;
      });
      observer.observe(textarea);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      adjustHeight();
    }, [adjustHeight, value, defaultValue]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onChange?.(e);
      onValueChange?.(e.target.value);
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
            'w-full min-h-control-lg px-space-12 py-space-8 rounded-ds-md border bg-surface font-text font-medium text-body text-ink placeholder:text-ink-4 resize-y',
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

