'use client';

import React, { forwardRef } from 'react';

import { ActionButton, type ActionTarget } from '../Button/ActionButton';
import { cn } from '../cn';
import { concealMoney } from '../Conceal/concealMoney';
import { Text } from '../Text/Text';

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'action'> {
  /** Size for padding: 'sm' (px-space-16 py-space-20) or 'md' (px-space-20 py-space-40, default) */
  size?: 'sm' | 'md';
  /** Optional illustration slot */
  illustration?: React.ReactNode;
  /** Primary headline (rendered in display font, screen-title style) */
  title?: React.ReactNode;
  /** Explanatory one-sentence description */
  description?: React.ReactNode;
  /** Single action: action={{ label, onSelect, variant? }}, or { label, href, variant? } for a link */
  action?: {
    label: string;
    variant?: 'primary' | 'secondary' | 'link';
  } & ActionTarget;
  /** Second action, after the first: secondaryAction={{ label, onSelect }} or { label, href }. Always `secondary` (`link` when compact). */
  secondaryAction?: { label: string } & ActionTarget;
  /** Compact single-line style for small panels or widget rows */
  compact?: boolean;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      children,
      className,
      size = 'md',
      illustration,
      title,
      description,
      action,
      secondaryAction,
      compact = false,
      ...props
    },
    ref,
  ) => {
    if (compact) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center justify-center text-center gap-space-8 p-space-16 text-body text-ink-3',
            className,
          )}
          {...props}
        >
          {title ? (
            <Text variant="label" tone="ink" as="span">
              {concealMoney(title)}
            </Text>
          ) : null}
          {description ? (
            <Text variant="body" tone="ink-3" as="span">
              {concealMoney(description)}
            </Text>
          ) : null}
          {children}
          {action ? (
            <ActionButton
              variant={action.variant ?? 'link'}
              href={action.href}
              onSelect={action.onSelect}
              className="text-inherit"
            >
              {action.label}
            </ActionButton>
          ) : null}
          {secondaryAction ? (
            <ActionButton
              variant="link"
              href={secondaryAction.href}
              onSelect={secondaryAction.onSelect}
              className="text-inherit"
            >
              {secondaryAction.label}
            </ActionButton>
          ) : null}
        </div>
      );
    }

    const paddingClass =
      size === 'sm' ? 'px-space-16 py-space-20' : 'px-space-20 py-space-40';

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center gap-space-8 text-ink-3',
          paddingClass,
          className,
        )}
        {...props}
      >
        {illustration && <div className="mb-space-4">{illustration}</div>}
        {title && (
          <Text
            variant="screen-title"
            family="display"
            as="h3"
            className="m-0 text-ink"
          >
            {concealMoney(title)}
          </Text>
        )}
        {description && (
          <Text variant="body" tone="ink-3" as="p" className="max-w-xs m-0">
            {concealMoney(description)}
          </Text>
        )}
        {children}
        {(action || secondaryAction) && (
          <div className="mt-space-8 flex items-center justify-center gap-space-8 flex-wrap">
            {action && (
              <ActionButton
                variant={action.variant ?? 'primary'}
                href={action.href}
                onSelect={action.onSelect}
              >
                {action.label}
              </ActionButton>
            )}
            {secondaryAction && (
              <ActionButton
                variant="secondary"
                href={secondaryAction.href}
                onSelect={secondaryAction.onSelect}
              >
                {secondaryAction.label}
              </ActionButton>
            )}
          </div>
        )}
      </div>
    );
  },
);

EmptyState.displayName = 'EmptyState';
