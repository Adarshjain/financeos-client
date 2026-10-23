'use client';

import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { concealMoney } from '../Conceal/concealMoney';
import { Icon } from '../Icon/Icon';
import { type BannerTone,bannerToneStyles } from './toneStyles';

export type { BannerTone };

export type BannerVariant = 'inline' | 'page-top';

export interface BannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'action'> {
  /** Tone of the banner */
  tone?: BannerTone;
  /** inline (default): a rounded message inside a page. page-top: full width at the very top of the app, square, clearing the device safe areas */
  variant?: BannerVariant;
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
      variant = 'inline',
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
    const pageTop = variant === 'page-top';
    const row = 'px-space-12 py-space-10 flex items-center gap-space-8';

    return (
      <div
        ref={ref}
        role={computedRole}
        className={cn(
          'text-label',
          pageTop ? 'pt-safe-top pl-safe-left pr-safe-right' : cn('rounded-ds-lg', row),
          bannerToneStyles[tone],
          className,
        )}
        {...props}
      >
        <div className={pageTop ? row : 'contents'}>
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
