'use client';

import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { useControllableState } from '../useControllableState';

export interface RadioProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onChange' | 'value' | 'defaultValue' | 'role'
  > {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  value?: string;
}

export const Radio = forwardRef<HTMLButtonElement, RadioProps>(
  (
    {
      className,
      checked,
      defaultChecked = false,
      onCheckedChange,
      disabled,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [isChecked, setChecked] = useControllableState<boolean>({
      value: checked,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    });

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isChecked}
        data-checked={isChecked ? '' : undefined}
        disabled={disabled}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented || isChecked) return;
          setChecked(true);
        }}
        className={cn(
          'group peer shrink-0 inline-flex items-center justify-center align-middle w-space-16 h-space-16 rounded-ds-pill border-2 transition-colors select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'bg-surface border-line-strong hover:bg-hover active:bg-pressed',
          'data-checked:border-brand data-checked:hover:border-brand-hover data-checked:active:border-brand-pressed',
          className,
        )}
        {...props}
      >
        {isChecked ? (
          <span className="w-space-8 h-space-8 rounded-ds-pill bg-brand group-hover:bg-brand-hover group-active:bg-brand-pressed" />
        ) : null}
      </button>
    );
  },
);

Radio.displayName = 'Radio';
