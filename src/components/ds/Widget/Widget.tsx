'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Icon } from '../Icon/Icon';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from '../Menu/Menu';
import { Skeleton } from '../Skeleton/Skeleton';

export interface WidgetMenuItem {
  label: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}

export interface WidgetAction {
  label: string;
  onSelect: () => void;
}

export interface WidgetProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Widget title, e.g. "Spend this month", "Upcoming", "Portfolio" */
  title?: React.ReactNode;
  /** Widget subtitle / timeframe, e.g. "vs Sep", "Next 14 days", "Report" */
  subtitle?: React.ReactNode;
  /** Custom trailing menu trigger or element */
  menu?: React.ReactNode;
  /** List of kebab menu items */
  menuItems?: WidgetMenuItem[];
  /** Whether the widget is loading */
  loading?: boolean;
  /** Custom loading skeleton node */
  loadingSkeleton?: React.ReactNode;
  /** Failed error message node */
  error?: React.ReactNode;
  /** Optional error title, e.g. "Couldn't load this widget" */
  errorTitle?: React.ReactNode;
  /** Unavailable status message node, shown when the content can't be shown */
  unavailable?: React.ReactNode;
  /** Optional unavailable title, e.g. "This report is no longer available" */
  unavailableTitle?: React.ReactNode;
  /** Action for error or unavailable states (e.g. Retry or Remove) */
  action?: WidgetAction;
}

export const Widget = forwardRef<HTMLDivElement, WidgetProps>(
  (
    {
      title,
      subtitle,
      menu,
      menuItems,
      loading = false,
      loadingSkeleton,
      error,
      errorTitle,
      unavailable,
      unavailableTitle,
      action,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const renderMenu = () => {
      if (menu) return menu;
      if (menuItems && menuItems.length > 0) {
        return (
          <Menu.Root>
            <MenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                iconOnly
                aria-label="Widget options"
                className="text-ink-4 hover:text-ink shrink-0"
              >
                <Icon name="more" size="sm" />
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              {menuItems.map((item, idx) => (
                <MenuItem
                  key={idx}
                  destructive={item.destructive}
                  onSelect={item.onSelect}
                >
                  {item.label}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu.Root>
        );
      }
      return null;
    };

    const renderBody = () => {
      if (loading) {
        if (loadingSkeleton) return loadingSkeleton;
        return (
          <div className="flex flex-col gap-space-8">
            <Skeleton width="80%" height={12} />
            <Skeleton width="60%" height={12} />
            <Skeleton width="70%" height={12} />
          </div>
        );
      }

      if (error) {
        return (
          <div
            role="alert"
            className="flex gap-space-10 items-start text-label text-danger"
          >
            <div>
              {errorTitle ? <b className="font-bold">{errorTitle}</b> : null}
              <div className="text-caption font-medium text-ink-3 mt-space-2">
                {error}
                {action ? (
                  <>
                    {' '}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={action.onSelect}
                      className="text-ink font-bold"
                    >
                      {action.label}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      }

      if (unavailable) {
        return (
          <div className="flex gap-space-10 items-start text-label text-ink-3">
            <div>
              {unavailableTitle ? (
                <b className="font-bold text-ink-2">{unavailableTitle}</b>
              ) : null}
              <div className="text-caption font-medium text-ink-3 mt-space-2">
                {unavailable}
                {action ? (
                  <>
                    {' '}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={action.onSelect}
                      className="text-ink font-bold"
                    >
                      {action.label}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      }

      return children;
    };

    return (
      <Card
        ref={ref}
        title={title}
        subtitle={subtitle}
        action={renderMenu()}
        className={className}
        {...props}
      >
        <div className="px-space-14 pb-space-12 pt-0 flex-1">{renderBody()}</div>
      </Card>
    );
  },
);

Widget.displayName = 'Widget';
