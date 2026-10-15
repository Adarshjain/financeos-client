import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type BannerTone = 'err' | 'ok' | 'info' | 'warn';

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tone of the banner */
  tone?: BannerTone;
  /** Optional trailing or inline action */
  action?: React.ReactNode;
}

const toneStyles: Record<BannerTone, string> = {
  err: 'bg-danger-tint text-danger-ink',
  ok: 'bg-positive-tint text-positive-strong',
  info: 'bg-info-tint text-info-ink',
  warn: 'bg-warning-tint text-warning-ink',
};

export const Banner = forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      children,
      className,
      tone = 'info',
      action,
      role,
      ...props
    },
    ref,
  ) => {
    const isError = tone === 'err';
    const computedRole = role || (isError ? 'alert' : 'status');

    return (
      <div
        ref={ref}
        role={computedRole}
        className={cn(
          'text-label rounded-ds-lg px-space-12 py-space-10 flex items-start justify-between gap-space-10',
          toneStyles[tone] || toneStyles.info,
          className,
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">{children}</div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  },
);

Banner.displayName = 'Banner';
