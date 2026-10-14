import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type BannerTone =
  | 'err'
  | 'error'
  | 'ok'
  | 'success'
  | 'info'
  | 'warn'
  | 'warning';

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tone of the banner */
  tone?: BannerTone;
  /** Alias for tone */
  variant?: BannerTone;
  /** Optional trailing or inline action */
  action?: React.ReactNode;
}

export const Banner = forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      children,
      className,
      tone,
      variant = 'info',
      action,
      role,
      ...props
    },
    ref,
  ) => {
    const resolvedTone = tone || variant;

    const toneStyles: Record<string, string> = {
      err: 'bg-danger-tint text-danger-ink',
      error: 'bg-danger-tint text-danger-ink',
      ok: 'bg-brand-tint text-brand-strong',
      success: 'bg-brand-tint text-brand-strong',
      info: 'bg-info-tint text-info-ink',
      warn: 'bg-warning-tint text-warning-ink',
      warning: 'bg-warning-tint text-warning-ink',
    };

    const isError = resolvedTone === 'err' || resolvedTone === 'error';
    const computedRole = role || (isError ? 'alert' : 'status');

    return (
      <div
        ref={ref}
        role={computedRole}
        className={cn(
          'text-label rounded-ds-lg px-space-12 py-space-10 flex items-start justify-between gap-space-10',
          toneStyles[resolvedTone] || toneStyles.info,
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
