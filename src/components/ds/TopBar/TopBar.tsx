import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { Kbd } from '../Kbd/Kbd';

export interface TopBarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  onAdd?: () => void;
  addLabel?: React.ReactNode;
  onChat?: () => void;
  onNotifications?: () => void;
  actions?: React.ReactNode;
}

/**
 * Desktop bar above every page, 56px (`h-app-bar`), `bg-surface` with a `line` bottom border.
 * Page title or crumb + title on the left; Add button (⌘N), chat and notifications on the right.
 */
export const TopBar = forwardRef<HTMLElement, TopBarProps>(
  (
    {
      title,
      crumb,
      onAdd,
      addLabel,
      onChat,
      onNotifications,
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
          'w-full h-app-bar min-h-app-bar bg-surface border-b border-line px-space-24 flex items-center justify-between text-body select-none',
          className,
        )}
        {...props}
      >
        {/* Left: title or crumb + title */}
        <div className="flex items-center gap-space-8 min-w-0">
          {crumb ? (
            <>
              <span className="text-label font-semibold text-ink-3">
                {crumb}
              </span>
              <span className="text-label text-ink-4">/</span>
            </>
          ) : null}
          <div className="text-title font-extrabold text-ink leading-tight truncate">
            {title}
          </div>
        </div>

        {/* Right: Add button with ⌘N, chat, and notifications */}
        <div className="flex items-center gap-space-8 shrink-0">
          {actions ?? (
            <>
              {onAdd ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onAdd}
                  className="gap-space-6"
                >
                  <Icon name="add" size="md" />
                  {addLabel ?? (
                    <span className="flex items-center gap-space-6">
                      Add <Kbd>⌘N</Kbd>
                    </span>
                  )}
                </Button>
              ) : null}

              {onChat ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  iconOnly
                  aria-label="Chat"
                  onClick={onChat}
                >
                  <Icon name="chat" size="md" />
                </Button>
              ) : null}

              {onNotifications ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  iconOnly
                  aria-label="Notifications"
                  onClick={onNotifications}
                >
                  <Icon name="notifications" size="md" />
                </Button>
              ) : null}
            </>
          )}
        </div>
      </header>
    );
  },
);

TopBar.displayName = 'TopBar';
