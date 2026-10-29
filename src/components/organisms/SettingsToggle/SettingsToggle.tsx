'use client';

import React, { forwardRef, useId } from 'react';

import { cn, ListRow, Switch, Text } from '@/components/ds';

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
  /** Drops the row's side gutter (default); pass false inside a container that does not pad its rows */
  flush?: boolean;
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
      flush = true,
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
        wrap
        disabled={disabled}
        flush={flush}
        className={className}
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
