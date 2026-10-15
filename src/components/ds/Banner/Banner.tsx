import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type BannerTone =
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral'
  // Legacy aliases
  | 'err'
  | 'ok'
  | 'warn'
  | 'callout'
  | 'note';

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tone of the banner */
  tone?: BannerTone;
  /** Optional bold lead-in title */
  title?: React.ReactNode;
  /** Optional trailing action */
  action?: React.ReactNode;
}

export const bannerToneStyles: Record<
  'danger' | 'success' | 'warning' | 'info' | 'neutral',
  string
> = {
  danger: 'bg-danger-tint text-danger-ink border border-transparent',
  success: 'bg-positive-tint text-positive-strong border border-transparent',
  warning: 'bg-warning-tint text-warning-ink border border-transparent',
  info: 'bg-info-tint text-info-ink border border-transparent',
  neutral: 'bg-surface text-ink-2 border border-line',
};

function normalizeTone(
  tone: BannerTone,
): 'danger' | 'success' | 'warning' | 'info' | 'neutral' {
  switch (tone) {
    case 'err':
    case 'danger':
      return 'danger';
    case 'ok':
    case 'success':
      return 'success';
    case 'warn':
    case 'warning':
    case 'callout':
      return 'warning';
    case 'info':
      return 'info';
    case 'note':
    case 'neutral':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export const Banner = forwardRef<HTMLDivElement, BannerProps>(
  (
    { children, className, tone = 'info', title, action, role, ...props },
    ref,
  ) => {
    const normalizedTone = normalizeTone(tone);
    const isError = normalizedTone === 'danger';
    const computedRole = role || (isError ? 'alert' : 'status');

    return (
      <div
        ref={ref}
        role={computedRole}
        className={cn(
          'text-label rounded-ds-lg px-space-12 py-space-10 flex items-start justify-between gap-space-10',
          bannerToneStyles[normalizedTone],
          className,
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {title && <span className="font-extrabold mr-space-6">{title}</span>}
          {children}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  },
);

Banner.displayName = 'Banner';
