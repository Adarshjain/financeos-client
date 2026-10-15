'use client';

import {
  ChevronLeft,
  MessageSquare,
  Plus,
  Search,
} from 'lucide-react';
import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

export interface BrandMarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  symbol?: string;
}

export const BrandMark = forwardRef<HTMLSpanElement, BrandMarkProps>(
  ({ className, symbol = '₹', ...props }, ref) => {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className={cn(
          'w-control-md h-control-md rounded-ds-md bg-brand text-on-brand flex items-center justify-center font-display font-extrabold text-heading shrink-0 select-none leading-none',
          className,
        )}
        {...props}
      >
        {symbol}
      </span>
    );
  },
);
BrandMark.displayName = 'BrandMark';

export interface AppBarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
  backAriaLabel?: string;
  onAsk?: () => void;
  onSearch?: () => void;
  onAdd?: () => void;
  addAriaLabel?: string;
  showActions?: boolean;
  rightActions?: React.ReactNode;
  brandHref?: string;
}

/**
 * The phone app bar (the desktop shell is Rail and TopBar): the brand mark (or a back arrow
 * on detail screens), breadcrumb and screen title, then Ask the data, Search and the one +
 * (brand fill) that adds whatever the screen is about.
 */
export const AppBar = forwardRef<HTMLElement, AppBarProps>(
  (
    {
      title,
      crumb,
      back = false,
      onBack,
      backAriaLabel = 'Back',
      onAsk,
      onSearch,
      onAdd,
      addAriaLabel = 'Add',
      showActions = true,
      rightActions,
      brandHref,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <header
        ref={ref}
        className={cn(
          'flex items-center gap-space-8 px-space-12 py-space-10 bg-surface border-b border-line min-h-app-bar text-body select-none',
          className,
        )}
        {...props}
      >
        {back ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            iconOnly
            aria-label={backAriaLabel}
            onClick={onBack}
            className="shrink-0 text-ink-2 hover:text-ink"
          >
            <Icon icon={ChevronLeft} size="md" />
          </Button>
        ) : brandHref ? (
          <a
            href={brandHref}
            aria-label="FinanceOS home"
            className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-ds-md"
          >
            <BrandMark />
          </a>
        ) : (
          <BrandMark />
        )}

        <div className="flex-1 min-w-0 pr-space-4">
          {crumb ? (
            <div className="text-caption font-semibold text-ink-3 leading-none mb-space-2 truncate">
              {crumb}
            </div>
          ) : null}
          <div className="text-title font-extrabold text-ink leading-tight truncate">
            {title}
          </div>
        </div>

        {rightActions ? (
          <div className="flex items-center gap-space-4 shrink-0">
            {rightActions}
          </div>
        ) : showActions ? (
          <div className="flex items-center gap-space-4 shrink-0">
            {onAsk ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                iconOnly
                aria-label="Ask the data"
                onClick={onAsk}
              >
                <Icon icon={MessageSquare} size="md" />
              </Button>
            ) : null}
            {onSearch ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                iconOnly
                aria-label="Search"
                onClick={onSearch}
              >
                <Icon icon={Search} size="md" />
              </Button>
            ) : null}
            {onAdd ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                iconOnly
                aria-label={addAriaLabel}
                onClick={onAdd}
              >
                <Icon icon={Plus} size="md" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>
    );
  },
);

AppBar.displayName = 'AppBar';
