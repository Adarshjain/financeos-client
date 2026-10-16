'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'onChange'> {}

export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(
  (
    {
      className,
      checked,
      defaultChecked,
      onCheckedChange,
      ...props
    },
    ref,
  ) => {
    return (
      <CheckboxPrimitive.Root
        ref={ref}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        className={cn(
          'group peer shrink-0 inline-flex items-center justify-center align-middle w-space-16 h-space-16 rounded-ds-xs border-2 text-on-brand transition-colors select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'bg-surface border-line-strong hover:bg-hover active:bg-pressed',
          'data-checked:bg-brand data-checked:border-brand data-checked:hover:bg-brand-hover data-checked:hover:border-brand-hover data-checked:active:bg-brand-pressed data-checked:active:border-brand-pressed',
          'data-indeterminate:bg-brand data-indeterminate:border-brand data-indeterminate:hover:bg-brand-hover data-indeterminate:hover:border-brand-hover data-indeterminate:active:bg-brand-pressed data-indeterminate:active:border-brand-pressed',
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <Icon name="check" size="sm" className="hidden group-data-checked:block" />
          <Icon name="minus" size="sm" className="hidden group-data-indeterminate:block" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);

Checkbox.displayName = 'Checkbox';
