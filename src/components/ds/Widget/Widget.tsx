'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
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
  /** Failed error message or boolean */
  error?: React.ReactNode | boolean;
  errorTitle?: React.ReactNode;
  errorMessage?: React.ReactNode;
  retryLabel?: string;
  /** Retry callback if failed */
  onRetry?: () => void;
  /** Unavailable status message or boolean when report was deleted */
  unavailable?: React.ReactNode | boolean;
  unavailableTitle?: React.ReactNode;
  unavailableMessage?: React.ReactNode;
  removeLabel?: string;
  /** Callback to remove widget when unavailable */
  onRemove?: () => void;
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
      errorMessage,
      retryLabel = 'Retry',
      onRetry,
      unavailable,
      unavailableTitle,
      unavailableMessage,
      removeLabel = 'Remove',
      onRemove,
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
        const resolvedTitle =
          errorTitle ??
          (typeof error === 'string'
            ? null
            : React.isValidElement(error)
              ? null
              : undefined);
        const resolvedMsg =
          errorMessage ??
          (typeof error === 'string' || React.isValidElement(error)
            ? error
            : null);

        return (
          <div role="alert" className="flex gap-space-10 items-start text-label text-danger">
            <div>
              {resolvedTitle && <b className="font-bold">{resolvedTitle}</b>}
              <div className="text-caption font-medium text-ink-3 mt-space-2">
                {resolvedMsg}
                {onRetry && (
                  <>
                    {resolvedMsg ? ' ' : null}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={onRetry}
                      className="text-ink font-bold"
                    >
                      {retryLabel}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }

      if (unavailable) {
        const resolvedTitle =
          unavailableTitle ??
          (typeof unavailable === 'string'
            ? null
            : React.isValidElement(unavailable)
              ? null
              : undefined);
        const resolvedMsg =
          unavailableMessage ??
          (typeof unavailable === 'string' || React.isValidElement(unavailable)
            ? unavailable
            : null);

        return (
          <div className="flex gap-space-10 items-start text-label text-ink-3">
            <div>
              {resolvedTitle && (
                <b className="font-bold text-ink-2">{resolvedTitle}</b>
              )}
              <div className="text-caption font-medium text-ink-3 mt-space-2">
                {resolvedMsg}
                {onRemove && (
                  <>
                    {resolvedMsg ? ' ' : null}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={onRemove}
                      className="text-ink font-bold"
                    >
                      {removeLabel}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }

      return children;
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface border border-line rounded-ds-lg min-w-0 flex flex-col select-none',
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-space-8 px-space-14 pt-space-12 pb-space-6">
          <div>
            {title && (
              <div className="text-body-strong font-extrabold text-ink">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="text-caption font-medium text-ink-3">
                {subtitle}
              </div>
            )}
          </div>
          {renderMenu()}
        </div>
        <div className="px-space-14 pb-space-12 pt-0 flex-1">{renderBody()}</div>
      </div>
    );
  },
);

Widget.displayName = 'Widget';
