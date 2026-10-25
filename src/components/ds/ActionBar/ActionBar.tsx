'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import type { DialogAction, DialogPrimaryAction } from '../Dialog/Dialog';
import { dockedBarSurface } from '../dockedBar';
import { Icon } from '../Icon/Icon';

export interface ActionBarActions {
  /** First, far left of the actions */
  tertiary?: DialogAction;
  secondary?: DialogAction;
  /** Last, the only filled button; `destructive` draws it danger-filled */
  primary?: DialogPrimaryAction;
}

export interface ActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Up to three actions as data, drawn left to right: tertiary, secondary, primary. */
  actions: ActionBarActions;
  /** Left side: a note ("Unsaved changes") and/or a menu. */
  start?: React.ReactNode;
}

const actionClass = 'min-w-0 shrink';

/**
 * ActionBar: the page-level action bar docked at the bottom (report editor: Cancel, Save, an unsaved note and a menu).
 * Same surface as SelectionBar. Phone: fixed above the floating tab bar, with its gutter (it does not hide the tab bar).
 * Desktop: a floating pill centred at the bottom. Pages add `pb-bottom-clearance desk:pb-space-96` to the end of their content so nothing sits behind it.
 */
export const ActionBar = forwardRef<HTMLDivElement, ActionBarProps>(
  ({ actions, start, className, ...props }, ref) => {
    const { tertiary, secondary, primary } = actions;
    return (
      <div
        ref={ref}
        data-action-bar=""
        className={cn(
          'fixed inset-x-space-12 bottom-bottom-clearance desk:inset-x-0 desk:bottom-safe-12 z-floating',
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            dockedBarSurface,
            'border rounded-ds-2xl flex items-center gap-space-8 px-space-12 py-space-8 desk:gap-space-16',
          )}
        >
          {start ? (
            <div className="flex items-center gap-space-8 min-w-0 flex-1 desk:flex-none">{start}</div>
          ) : null}
          <div className={cn('flex items-center gap-space-12 min-w-0', !start && 'w-full justify-end')}>
            {tertiary ? (
              <Button
                variant={tertiary.tone === 'danger' ? 'danger-link' : 'link'}
                size="md"
                type={tertiary.type ?? 'button'}
                form={tertiary.form}
                disabled={tertiary.disabled}
                loading={tertiary.loading}
                icon={tertiary.icon ? <Icon name={tertiary.icon} size="xs" /> : undefined}
                onClick={tertiary.onSelect}
                className={actionClass}
              >
                {tertiary.label}
              </Button>
            ) : null}
            {secondary ? (
              <Button
                variant={secondary.tone === 'danger' ? 'danger-link' : 'link'}
                size="md"
                type={secondary.type ?? 'button'}
                form={secondary.form}
                disabled={secondary.disabled}
                loading={secondary.loading}
                icon={secondary.icon ? <Icon name={secondary.icon} size="xs" /> : undefined}
                onClick={secondary.onSelect}
                className={actionClass}
              >
                {secondary.label}
              </Button>
            ) : null}
            {primary ? (
              <Button
                variant={primary.destructive ? 'danger-filled' : 'primary'}
                size="md"
                type={primary.type ?? 'button'}
                form={primary.form}
                disabled={primary.disabled}
                loading={primary.loading}
                icon={primary.icon ? <Icon name={primary.icon} size="xs" /> : undefined}
                onClick={primary.onSelect}
                className={actionClass}
              >
                {primary.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  },
);

ActionBar.displayName = 'ActionBar';
