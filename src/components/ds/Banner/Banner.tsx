'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { concealMoney } from '../Conceal/concealMoney';
import { Icon } from '../Icon/Icon';
import { type BannerTone,bannerToneStyles } from './toneStyles';

export type { BannerTone };

export type BannerRounded = 'none' | 'sm' | 'md' | 'lg';

const roundedStyles: Record<BannerRounded, string> = {
  none: 'rounded-none',
  sm: 'rounded-ds-sm',
  md: 'rounded-ds-md',
  lg: 'rounded-ds-lg',
};

export interface BannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'action'> {
  /** Tone of the banner */
  tone?: BannerTone;
  /** Corner radius: lg (default) inside a page, none for a full-width banner at the edge of the app */
  rounded?: BannerRounded;
  /** Optional bold lead-in title */
  title?: React.ReactNode;
  /** Optional single action on the right: action={{ label, onSelect }} */
  action?: { label: React.ReactNode; onSelect: () => void };
  /** Optional dismiss callback */
  onDismiss?: () => void;
}

export const Banner = forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      children,
      className,
      tone = 'info',
      rounded = 'lg',
      title,
      action,
      onDismiss,
      role,
      ...props
    },
    ref,
  ) => {
    const isError = tone === 'danger';
    const computedRole = role || (isError ? 'alert' : 'status');

    return (
      <div
        ref={ref}
        role={computedRole}
        className={cn(
          'text-label flex items-center',
          roundedStyles[rounded],
          bannerToneStyles[tone],
          className,
        )}
        {...props}
      >
        {/* The message row; padding the page adds through className (e.g. safe-area insets) sits around it. */}
        <div className="flex-1 min-w-0 px-space-12 py-space-10 flex items-center gap-space-8">
          <div className="flex-1 min-w-0">
            {title ? (
              <span className="font-extrabold mr-space-6">{concealMoney(title)}</span>
            ) : null}
            {children ? <div className="inline">{concealMoney(children)}</div> : null}
          </div>
          {action ? (
            <div className="shrink-0 flex items-center">
              <Button
                type="button"
                variant="link"
                onClick={action.onSelect}
                className="text-inherit"
              >
                {action.label}
              </Button>
            </div>
          ) : null}
          {onDismiss ? (
            <div className="shrink-0 flex items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                icon={<Icon name="close" />}
                aria-label="Close"
                onClick={onDismiss}
                className="text-inherit hover:opacity-80"
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

Banner.displayName = 'Banner';
