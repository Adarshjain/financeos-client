import React, { forwardRef } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';

export type BannerTone =
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral';

export interface BannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Tone of the banner */
  tone?: BannerTone;
  /** Optional bold lead-in title */
  title?: React.ReactNode;
  /** Optional trailing action */
  action?: React.ReactNode;
}

export const bannerToneStyles: Record<BannerTone, string> = {
  danger: 'bg-danger-tint text-danger-ink border border-transparent',
  success: 'bg-positive-tint text-positive-strong border border-transparent',
  warning: 'bg-warning-tint text-warning-ink border border-transparent',
  info: 'bg-info-tint text-info-ink border border-transparent',
  neutral: 'bg-surface text-ink-2 border border-line',
};

export const Banner = forwardRef<HTMLDivElement, BannerProps>(
  (
    { children, className, tone = 'info', title, action, role, ...props },
    ref,
  ) => {
    const isError = tone === 'danger';
    const computedRole = role || (isError ? 'alert' : 'status');

    const renderedAction =
      typeof action === 'string' ? (
        <Button variant="link">{action}</Button>
      ) : (
        action
      );

    return (
      <div
        ref={ref}
        role={computedRole}
        className={cn(
          'text-label rounded-ds-lg px-space-12 py-space-10 flex items-center',
          bannerToneStyles[tone],
          className,
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {title && <span className="font-extrabold mr-space-6">{title}</span>}
          {children ? <span>{children}</span> : null}
          {action ? (
            <span className="inline-block ml-space-8 align-baseline">
              {renderedAction}
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);

Banner.displayName = 'Banner';

