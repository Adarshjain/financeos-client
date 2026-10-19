'use client';

import React, { forwardRef, useId } from 'react';

import { ListRow, Switch, Text } from '@/components/ds';
import { cn } from '@/components/ds/cn';

export interface SettingsToggleProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'title'> {
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  borderTop?: boolean;
}

export const SettingsToggle = forwardRef<HTMLDivElement, SettingsToggleProps>(
  (
    {
      label,
      description,
      error,
      checked,
      defaultChecked,
      onCheckedChange,
      disabled = false,
      borderTop = false,
      className,
      id: explicitId,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = explicitId || generatedId;

    return (
      <ListRow
        ref={ref}
        title={
          <label
            htmlFor={id}
            className={cn('select-none', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
          >
            {label}
          </label>
        }
        subtitle={description}
        trailing={
          <Switch
            id={id}
            checked={checked}
            defaultChecked={defaultChecked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
          />
        }
        borderTop={borderTop}
        disabled={disabled}
        className={cn('px-0 border-l-0', className)}
        {...props}
      >
        {error ? (
          <div className="mt-space-4">
            <Text variant="caption" tone="danger">
              {error}
            </Text>
          </div>
        ) : null}
      </ListRow>
    );
  },
);

SettingsToggle.displayName = 'SettingsToggle';
