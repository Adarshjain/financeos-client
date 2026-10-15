import { MoreVertical } from 'lucide-react';
import React, { forwardRef } from 'react';

import { cn } from '../cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  /** Failed error message or true */
  error?: React.ReactNode | boolean;
  /** Retry callback if failed */
  onRetry?: () => void;
  /** Unavailable status message or true when report was deleted */
  unavailable?: React.ReactNode | boolean;
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
      onRetry,
      unavailable,
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Widget options"
                className="p-space-2 text-ink-4 hover:text-ink rounded-ds-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <MoreVertical
                  className="w-space-14 h-space-14"
                  aria-hidden="true"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuItems.map((item, idx) => (
                <DropdownMenuItem
                  key={idx}
                  destructive={item.destructive}
                  onSelect={item.onSelect}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div role="alert" className="flex gap-space-10 items-start text-label text-danger">
            <div>
              <b className="font-bold">Couldn&apos;t load this widget</b>
              <div className="text-caption font-medium text-ink-3 mt-space-2">
                {typeof error === 'string' || React.isValidElement(error) ? (
                  error
                ) : (
                  <>
                    Prices service did not answer.
                    {onRetry && (
                      <>
                        {' '}
                        <button
                          type="button"
                          onClick={onRetry}
                          className="text-ink font-bold underline hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                        >
                          Retry
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }

      if (unavailable) {
        return (
          <div className="flex gap-space-10 items-start text-label text-ink-3">
            <div>
              <b className="font-bold text-ink-2">
                This report is no longer available
              </b>
              <div className="text-caption font-medium text-ink-3 mt-space-2">
                {typeof unavailable === 'string' ||
                React.isValidElement(unavailable) ? (
                  unavailable
                ) : (
                  <>
                    {onRemove ? (
                      <>
                        <button
                          type="button"
                          onClick={onRemove}
                          className="text-ink font-bold underline hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                        >
                          Remove
                        </button>
                        {' the widget or pick another report.'}
                      </>
                    ) : (
                      'Remove the widget or pick another report.'
                    )}
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
