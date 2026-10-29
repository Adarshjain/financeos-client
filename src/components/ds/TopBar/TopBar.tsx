'use client';

import React, { forwardRef } from 'react';

import { ActionButton } from '../Button/ActionButton';
import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon, type IconSize } from '../Icon/Icon';
import type { IconName } from '../Icon/registry';
import { Kbd } from '../Kbd/Kbd';
import { Menu } from '../Menu/Menu';
import { Popover } from '../Popover/Popover';

/** One row of a TopBarAction menu: a button row (`onSelect`) or a link row (`href`). */
export interface TopBarMenuItem {
  id: string;
  label: string;
  onSelect?: () => void;
  /** The row renders `children` (a link element from the app) with the label inside. */
  asChild?: boolean;
  children?: React.ReactNode;
}

export interface TopBarAction {
  id: string;
  icon: IconName;
  label: string;
  onSelect?: () => void;
  /** A plain action with an `href` renders a link (the app's link through LinkProvider) with the same look; `onSelect` still runs on click. Not for menu, popover or asChild actions. */
  href?: string;
  variant?: 'default' | 'primary';
  /** Shows the button's loading state (spinner) and ignores presses, e.g. while the action's dialog code loads. Plain actions only. */
  loading?: boolean;
  shortcut?: string;
  showLabel?: boolean;
  /** Icon size while the label shows (desktop form); the icon-only phone form keeps md. */
  labelIconSize?: IconSize;
  asChild?: boolean;
  children?: React.ReactNode;
  /** Shows the action in the phone layout only (hidden from `desk`), e.g. a button whose desktop twin is in the Rail. */
  phoneOnly?: boolean;
  /** Draws a danger dot on the button (something unread). */
  dot?: boolean;
  /** Opens a dropdown from the button; never asChild. */
  popover?: { content: React.ReactNode; onOpenChange?: (open: boolean) => void; /** Called on pointer-enter or focus of the trigger so the content's data can be warmed before it opens. */ onWarm?: () => void };
  /** Opens a Menu of these rows from the button (align end); never asChild or popover. */
  menu?: TopBarMenuItem[];
}

export interface TopBarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  leading?: React.ReactNode;
  /** Back target. With `onBack` too, a plain click calls `onBack` and the href serves middle-click and SSR. */
  backHref?: string;
  onBack?: () => void;
  actions?: TopBarAction[];
}

/**
 * TopBar: the bar at the top of every screen.
 * Phone form: Leading slot (or back arrow), crumb and title, bordered control-md icon actions.
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
            onClick={
              onBack
                ? (e) => {
                    // A plain click goes through onBack (browser back); modified clicks keep the href.
                    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    onBack();
                  }
                : undefined
            }
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
          'w-full h-safe-56 min-h-safe-56 pt-safe-top bg-surface glass:bg-glass glass:backdrop-blur-glass glass:backdrop-saturate-glass border-b border-line px-space-12 desk:px-space-24 flex items-center gap-space-8 desk:gap-space-10 text-body select-none',
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
        <div
          className={cn(
            'flex-1 min-w-0 pr-space-4 desk:flex desk:items-center desk:gap-space-8',
            // A node title (controls) takes all the free space at every width; a string stays content-width on desktop.
            typeof title !== 'string' && 'desk:flex-1',
            typeof title === 'string' && 'desk:flex-initial',
          )}
        >
          {crumb ? (
            <div className="flex items-center gap-space-8 min-w-0 mb-space-2 desk:mb-0">
              <span className="text-caption font-semibold text-ink-4 leading-none truncate desk:text-label desk:text-ink-3">
                {crumb}
              </span>
              <span className="hidden desk:inline text-label text-ink-4">/</span>
            </div>
          ) : null}
          {typeof title === 'string' ? (
            <div className="text-title font-extrabold text-ink leading-tight tracking-tight truncate">
              {title}
            </div>
          ) : (
            // A node (a Select trigger, a Menu button, a styled name): never a heading or clipped, so
            // controls keep their focus ring; centred, and every child may shrink on phone.
            <div className="flex flex-1 items-center gap-space-8 min-w-0 text-title font-extrabold text-ink leading-tight tracking-tight [&>*]:min-w-0">
              {title}
            </div>
          )}
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
                  {hasLabel && action.labelIconSize && action.labelIconSize !== 'md' ? (
                    <>
                      <Icon name={action.icon} size="md" className="desk:hidden" />
                      <Icon name={action.icon} size={action.labelIconSize} className="hidden desk:inline-block" />
                    </>
                  ) : (
                    <Icon name={action.icon} size="md" />
                  )}
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
                action.phoneOnly && 'desk:hidden',
                hasLabel
                  ? 'w-control-md h-control-md p-0 desk:w-auto desk:h-control-md desk:px-space-12 desk:gap-space-6'
                  : undefined,
              );

              if (action.menu) {
                return (
                  <Menu
                    key={action.id}
                    align="end"
                    trigger={
                      <Button
                        type="button"
                        variant={btnVariant}
                        size="md"
                        iconOnly={!hasLabel}
                        aria-label={action.label}
                        dot={action.dot}
                        className={buttonClasses}
                      >
                        {content}
                      </Button>
                    }
                  >
                    {action.menu.map((item) =>
                      item.asChild && React.isValidElement(item.children) ? (
                        <Menu.Item key={item.id} asChild>
                          {React.cloneElement(
                            item.children as React.ReactElement<{ children?: React.ReactNode }>,
                            undefined,
                            item.label,
                          )}
                        </Menu.Item>
                      ) : (
                        <Menu.Item key={item.id} onSelect={item.onSelect}>
                          {item.label}
                        </Menu.Item>
                      ),
                    )}
                  </Menu>
                );
              }

              if (action.popover) {
                return (
                  <Popover
                    key={action.id}
                    align="end"
                    onOpenChange={action.popover.onOpenChange}
                    trigger={
                      <Button
                        type="button"
                        variant={btnVariant}
                        size="md"
                        iconOnly={!hasLabel}
                        aria-label={action.label}
                        onClick={action.onSelect}
                        onPointerEnter={action.popover.onWarm}
                        onFocus={action.popover.onWarm}
                        dot={action.dot}
                        className={buttonClasses}
                      >
                        {content}
                      </Button>
                    }
                  >
                    {action.popover.content}
                  </Popover>
                );
              }

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
                    dot={action.dot}
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
                <ActionButton
                  key={action.id}
                  variant={btnVariant}
                  size="md"
                  iconOnly={!hasLabel}
                  aria-label={action.label}
                  href={action.href}
                  onSelect={action.onSelect}
                  loading={action.loading}
                  dot={action.dot}
                  className={buttonClasses}
                >
                  {content}
                </ActionButton>
              );
            })}
          </div>
        )}
      </header>
    );
  },
);

TopBar.displayName = 'TopBar';
