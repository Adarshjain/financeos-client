'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/registry';
import { Kbd } from '../Kbd/Kbd';
import { Logo } from '../Logo/Logo';

export interface TopBarAction {
  id: string;
  icon: IconName;
  label: string;
  href?: string;
  onSelect?: () => void;
  variant?: 'default' | 'primary';
  shortcut?: string;
  showLabel?: boolean;
}

export interface TopBarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  back?: string | (() => void) | boolean;
  actions?: TopBarAction[];
}

/**
 * TopBar: the bar at the top of every screen.
 * Phone form: Logo mark or back arrow, crumb and title, bordered control-md icon actions.
 * Desktop form: crumb and title on the left, labelled actions with their shortcut on the right.
 * The viewport picks the form via CSS (lg breakpoint).
 */
export const TopBar = forwardRef<HTMLElement, TopBarProps>(
  (
    {
      title,
      crumb,
      back,
      actions,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <header
        ref={ref}
        className={cn(
          'w-full h-space-56 min-h-space-56 bg-surface border-b border-line px-space-12 lg:px-space-24 flex items-center gap-space-8 lg:gap-space-10 text-body select-none',
          className,
        )}
        {...props}
      >
        {/* Phone leading: back arrow if back is provided, else Logo mark */}
        {back ? (
          typeof back === 'string' ? (
            <Button
              asChild
              variant="ghost"
              size="md"
              iconOnly
              aria-label="Back"
              className="lg:hidden shrink-0 text-ink-2 hover:text-ink"
            >
              <a href={back}>
                <Icon name="chevron-left" size="md" />
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="md"
              iconOnly
              aria-label="Back"
              onClick={typeof back === 'function' ? back : undefined}
              className="lg:hidden shrink-0 text-ink-2 hover:text-ink"
            >
              <Icon name="chevron-left" size="md" />
            </Button>
          )
        ) : (
          <Logo variant="mark" size="md" className="lg:hidden shrink-0" />
        )}

        {/* Title + Crumb: phone stacks them with crumb above title, desktop puts crumb inline before title */}
        <div className="flex-1 min-w-0 pr-space-4 lg:flex-initial lg:flex lg:items-center lg:gap-space-8">
          {crumb ? (
            <div className="flex items-center gap-space-8 min-w-0 mb-space-2 lg:mb-0">
              <span className="text-caption font-semibold text-ink-4 leading-none truncate lg:text-label lg:text-ink-3">
                {crumb}
              </span>
              <span className="hidden lg:inline text-label text-ink-4">/</span>
            </div>
          ) : null}
          <div className="text-title font-extrabold text-ink leading-tight tracking-tight truncate">
            {title}
          </div>
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="ml-auto flex items-center gap-space-4 lg:gap-space-8 shrink-0">
            {actions.map((action) => {
              const isPrimary = action.variant === 'primary';
              const hasLabel = Boolean(action.shortcut || action.showLabel);
              const btnVariant = isPrimary ? 'primary' : 'secondary';

              const content = (
                <>
                  <Icon name={action.icon} size="md" />
                  {hasLabel && (
                    <span className="hidden lg:inline">{action.label}</span>
                  )}
                  {action.shortcut && (
                    <Kbd className="hidden lg:inline-flex">{action.shortcut}</Kbd>
                  )}
                </>
              );

              const buttonClasses = cn(
                'shrink-0',
                hasLabel
                  ? 'w-control-md h-control-md p-0 lg:w-auto lg:h-control-md lg:px-space-12 lg:gap-space-6'
                  : undefined,
              );

              if (action.href) {
                return (
                  <Button
                    key={action.id}
                    asChild
                    variant={btnVariant}
                    size="md"
                    iconOnly={!hasLabel}
                    aria-label={action.label}
                    className={buttonClasses}
                  >
                    <a href={action.href}>{content}</a>
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
