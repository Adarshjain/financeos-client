'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
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
  /** Single action: action={{ label, onSelect, variant? }} */
  action?: {
    label: React.ReactNode;
    onSelect: () => void;
    variant?: 'primary' | 'secondary' | 'link';
  };
  /** Second action, after the first: secondaryAction={{ label, onSelect }}. Always `secondary` (`link` when compact). */
  secondaryAction?: {
    label: React.ReactNode;
    onSelect: () => void;
  };
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
              {title}
            </Text>
          ) : null}
          {description ? (
            <Text variant="body" tone="ink-3" as="span">
              {description}
            </Text>
          ) : null}
          {children}
          {action ? (
            <Button
              type="button"
              variant={action.variant ?? 'link'}
              onClick={action.onSelect}
              className="text-inherit"
            >
              {action.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              type="button"
              variant="link"
              onClick={secondaryAction.onSelect}
              className="text-inherit"
            >
              {secondaryAction.label}
            </Button>
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
            {title}
          </Text>
        )}
        {description && (
          <Text variant="body" tone="ink-3" as="p" className="max-w-xs m-0">
            {description}
          </Text>
        )}
        {children}
        {(action || secondaryAction) && (
          <div className="mt-space-8 flex items-center justify-center gap-space-8 flex-wrap">
            {action && (
              <Button
                type="button"
                variant={action.variant ?? 'primary'}
                onClick={action.onSelect}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                type="button"
                variant="secondary"
                onClick={secondaryAction.onSelect}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  },
);

EmptyState.displayName = 'EmptyState';
