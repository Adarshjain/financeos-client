import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /** Right-aligned header control (a link or a small button). */
  action?: ReactNode;
  /** Extra classes for the body (e.g. removing side padding for full-bleed rows). */
  bodyClassName?: string;
  /** Omit for a header-only card (title, subtitle and an action). */
  children?: ReactNode;
  'data-testid'?: string;
}

/**
 * One section of the account page: the same card language as the dashboard widgets (rounded-xl,
 * soft border, a neutral icon chip, a sentence-case title with a muted subtitle) and one padding
 * scale for header and body, so content never touches the card edge.
 */
export function SectionCard({ icon, title, subtitle, action, bodyClassName, children, ...rest }: SectionCardProps) {
  const hasBody = children !== undefined && children !== null && children !== false;
  return (
    <section
      className="rounded-xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      data-testid={rest['data-testid']}
    >
      <header className={cn('flex items-center gap-3 px-4 pt-4 sm:px-5', hasBody ? 'pb-3' : 'pb-4')}>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 [&>svg]:h-4 [&>svg]:w-4"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          {subtitle ? <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {hasBody ? <div className={cn('px-4 pb-4 sm:px-5 sm:pb-5', bodyClassName)}>{children}</div> : null}
    </section>
  );
}
