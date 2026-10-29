'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { TextArea } from '../TextArea/TextArea';
import { useControllableState } from '../useControllableState';

export interface PromptFieldProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the trimmed text on Enter (without Shift) or the send button. */
  onSubmit?: (value: string) => void;
  /** Called by the stop button while `loading`. */
  onStop?: () => void;
  /** An answer is running: the button becomes stop and submitting is off. */
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Caption in the bar row, left of the button (desktop only). */
  hint?: React.ReactNode;
  sendLabel?: string;
  stopLabel?: string;
  autoFocus?: boolean;
  className?: string;
}

export const PromptField = forwardRef<HTMLTextAreaElement, PromptFieldProps>(
  (
    {
      value: valueProp,
      defaultValue = '',
      onValueChange,
      onSubmit,
      onStop,
      loading = false,
      disabled = false,
      placeholder = 'Ask…',
      hint,
      sendLabel = 'Send',
      stopLabel = 'Stop',
      autoFocus,
      className,
    },
    ref,
  ) => {
    const isControlled = valueProp !== undefined;
    const [value, setValue] = useControllableState<string>({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    });

    const submit = () => {
      const text = value.trim();
      if (loading || disabled || !text) return;
      onSubmit?.(text);
      if (!isControlled) setValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
      e.preventDefault();
      submit();
    };

    return (
      <div
        className={cn(
          'flex items-end gap-space-8 bg-surface border border-line-strong shadow-level-1 font-text',
          'rounded-ds-pill pl-space-16 pr-space-6 py-space-6',
          'desk:flex-col desk:items-stretch desk:gap-space-4 desk:rounded-ds-xl desk:p-space-10',
          'focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2',
          disabled && 'bg-sunken',
          className,
        )}
      >
        <TextArea
          ref={ref}
          className="flex-1 min-w-0 self-center desk:self-auto"
          controlClassName="border-0 bg-transparent min-h-0 px-0 py-space-4 resize-none focus:ring-0 focus:ring-offset-0 disabled:bg-transparent disabled:opacity-100"
          rows={1}
          maxRows={8}
          value={value}
          onValueChange={setValue}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
        />
        <div className="shrink-0 flex items-center desk:justify-between desk:gap-space-8">
          {hint ? (
            <span className="hidden desk:block min-w-0 text-caption text-ink-faint">{hint}</span>
          ) : null}
          {loading ? (
            <Button
              type="button"
              variant="primary"
              iconOnly
              icon={<Icon name="stop" />}
              aria-label={stopLabel}
              disabled={disabled}
              onClick={onStop}
              className="rounded-ds-pill"
            />
          ) : (
            <Button
              type="button"
              variant="primary"
              iconOnly
              icon={<Icon name="arrow-up" />}
              aria-label={sendLabel}
              disabled={disabled || !value.trim()}
              onClick={submit}
              className="rounded-ds-pill"
            />
          )}
        </div>
      </div>
    );
  },
);

PromptField.displayName = 'PromptField';
