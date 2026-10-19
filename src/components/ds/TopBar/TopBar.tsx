'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/registry';
import { Kbd } from '../Kbd/Kbd';

export interface TopBarAction {
  id: string;
  icon: IconName;
  label: string;
  onSelect?: () => void;
  variant?: 'default' | 'primary';
  shortcut?: string;
  showLabel?: boolean;
  asChild?: boolean;
  children?: React.ReactNode;
}

export interface TopBarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  leading?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
  actions?: TopBarAction[];
}

/**
 * TopBar: the bar at the top of every screen.
 * Phone form: Leading slot (or back arrow), crumb and title, bordered control-lg icon actions.
 * Desktop form: crumb and title on the left, labelled actions with their shortcut on the right.
 * The viewport picks the form via CSS (desk breakpoint).
 */
export const TopBar = forwardRef<HTMLElement, TopBarProps>(
  (
    {
      title,
      crumb,
      leading,
      backHref,
      onBack,
      actions,
      className,
      ...props
    },
    ref,
  ) => {
    let leadingContent: React.ReactNode = leading;
    // A custom leading slot stays phone-only; the back control shows at every width.
    let backContent = false;

    if (!leadingContent && (backHref || onBack)) {
      backContent = true;
      if (backHref) {
        leadingContent = (
          <Button
            asChild
            variant="ghost"
            size="md"
            iconOnly
            aria-label="Back"
            className="text-ink-2 hover:text-ink"
          >
            <a href={backHref}>
              <Icon name="chevron-left" size="md" />
            </a>
          </Button>
        );
      } else if (onBack) {
        leadingContent = (
          <Button
            type="button"
            variant="ghost"
            size="md"
            iconOnly
            aria-label="Back"
            onClick={onBack}
            className="text-ink-2 hover:text-ink"
          >
            <Icon name="chevron-left" size="md" />
          </Button>
        );
      }
    }

    return (
      <header
        ref={ref}
        className={cn(
          'w-full h-space-56 min-h-space-56 bg-surface border-b border-line px-space-12 desk:px-space-24 flex items-center gap-space-8 desk:gap-space-10 text-body select-none',
          className,
        )}
        {...props}
      >
        {/* Back arrow at every width; a custom leading slot is phone only */}
        {leadingContent ? (
          <div
            className={cn(
              'shrink-0 flex items-center',
              !backContent && 'desk:hidden',
            )}
          >
            {leadingContent}
          </div>
        ) : null}

        {/* Title + Crumb: phone stacks them with crumb above title, desktop puts crumb inline before title */}
        <div className="flex-1 min-w-0 pr-space-4 desk:flex-initial desk:flex desk:items-center desk:gap-space-8">
          {crumb ? (
            <div className="flex items-center gap-space-8 min-w-0 mb-space-2 desk:mb-0">
              <span className="text-caption font-semibold text-ink-4 leading-none truncate desk:text-label desk:text-ink-3">
                {crumb}
              </span>
              <span className="hidden desk:inline text-label text-ink-4">/</span>
            </div>
          ) : null}
          <div className="text-title font-extrabold text-ink leading-tight tracking-tight truncate">
            {title}
          </div>
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="ml-auto flex items-center gap-space-4 desk:gap-space-8 shrink-0">
            {actions.map((action) => {
              const isPrimary = action.variant === 'primary';
              const hasLabel = Boolean(action.shortcut || action.showLabel);
              const btnVariant = isPrimary ? 'primary' : 'secondary';

              const content = (
                <>
                  <Icon name={action.icon} size="md" />
                  {hasLabel && (
                    <span className="hidden desk:inline">{action.label}</span>
                  )}
                  {action.shortcut && (
                    <Kbd className="hidden desk:inline-flex">{action.shortcut}</Kbd>
                  )}
                </>
              );

              const buttonClasses = cn(
                'shrink-0',
                hasLabel
                  ? 'w-control-lg h-control-lg p-0 desk:w-auto desk:h-control-lg desk:px-space-12 desk:gap-space-6'
                  : undefined,
              );

              if (action.asChild && React.isValidElement(action.children)) {
                return (
                  <Button
                    key={action.id}
                    asChild
                    variant={btnVariant}
                    size="md"
                    iconOnly={!hasLabel}
                    aria-label={action.label}
                    onClick={action.onSelect}
                    className={buttonClasses}
                  >
                    {React.cloneElement(
                      action.children as React.ReactElement<{ children?: React.ReactNode }>,
                      undefined,
                      content,
                    )}
                  </Button>
                );
              }

              return (
                <Button
                  key={action.id}
                  type="button"
                  variant={btnVariant}
                  size="md"
                  iconOnly={!hasLabel}
                  aria-label={action.label}
                  onClick={action.onSelect}
                  className={buttonClasses}
                >
                  {content}
                </Button>
              );
            })}
          </div>
        )}
      </header>
    );
  },
);

TopBar.displayName = 'TopBar';
