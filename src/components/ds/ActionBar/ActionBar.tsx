import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { Menu } from '../Menu/Menu';
import { Text } from '../Text/Text';

export interface ActionBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** One short line on the left; truncates, never wraps. */
  info?: React.ReactNode;
  /** Buttons at the right. */
  actions?: React.ReactNode;
  /** Menu.Item children; when given, the ⋮ trigger is rendered after the actions. */
  menu?: React.ReactNode;
}

/**
 * ActionBar: the row under a detail page's Hero. One short fact on the left, the page's actions and an optional ⋮ menu
 * on the right. One row at every width, vertically centred.
 */
export const ActionBar = forwardRef<HTMLDivElement, ActionBarProps>(({ info, actions, menu, className, ...props }, ref) => {
  const hasEnd = Boolean(actions) || Boolean(menu);
  return (
    <div ref={ref} className={cn('flex items-center justify-between gap-space-8 desk:gap-space-12', className)} {...props}>
      {info ? (
        <Text variant="body" tone="ink-3" as="div" truncate className="min-w-0">
          {info}
        </Text>
      ) : (
        <span />
      )}
      {hasEnd ? (
        <div className="shrink-0 flex items-center gap-space-8">
          {actions}
          {menu ? (
            <Menu
              align="end"
              trigger={
                <Button variant="ghost" iconOnly aria-label="More actions">
                  <Icon name="more" size="md" />
                </Button>
              }
            >
              {menu}
            </Menu>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
ActionBar.displayName = 'ActionBar';
