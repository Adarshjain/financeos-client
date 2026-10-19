import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type SectionHeaderVariant = 'strong' | 'band';
export type SectionHeaderTone = 'neutral' | 'danger';

export interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Root HTML element tag. Defaults to 'div'. */
  as?: 'div' | 'h2' | 'h3';
  /** Variant of the header: 'strong' (prominent group/day header) or 'band' (section band). Defaults to 'band'. */
  variant?: SectionHeaderVariant;
  /** Semantic tone for color. Defaults to 'neutral'. */
  tone?: SectionHeaderTone;
  /** Optional meta text or node. */
  meta?: React.ReactNode;
  /** Optional control drawn at the row's right end, after meta. */
  action?: React.ReactNode;
  /** Whether the header is sticky (default true for variant='strong', false for others). */
  sticky?: boolean;
  /** Optional border-top toggle (default: true for band). */
  borderTop?: boolean;
  /** Primary label text or content. */
  children?: React.ReactNode;
}

/**
 * SectionHeader: The header that starts a section inside a list, card or sheet.
 * Variants:
 * - strong: prominent group header (e.g. sticky list header, label in text-label font-extrabold text-ink on bg-subtle)
 * - band: section divider in a card or sheet (e.g. overline caption in ink-4 on bg-sunken)
 * Tone:
 * - neutral: default ink color
 * - danger: destructive sections (text-danger)
 */
export const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(
  (
    {
      as: Component = 'div',
      className,
      children,
      variant = 'band',
      tone = 'neutral',
      meta,
      action,
      sticky,
      borderTop = true,
      ...props
    },
    ref,
  ) => {
    const isStrong = variant === 'strong';
    const isSticky = sticky ?? (isStrong ? true : false);
    const isDanger = tone === 'danger';

    return (
      <Component
        ref={ref as unknown as React.Ref<HTMLDivElement & HTMLHeadingElement>}
        className={cn(
          'flex gap-space-6 py-space-6 px-space-14 select-none border-b border-line-soft font-text',
          // With an action (a control), centre everything so the label lines up with it.
          action ? 'items-center' : 'items-baseline',
          isStrong
            ? 'bg-subtle text-label font-extrabold'
            : 'bg-sunken text-overline font-extrabold uppercase',
          isStrong
            ? isDanger
              ? 'text-danger'
              : 'text-ink'
            : isDanger
              ? 'text-danger'
              : 'text-ink-4',
          isStrong ? !borderTop && 'border-t-0' : borderTop && 'border-t',
          isSticky && 'sticky top-0 z-sticky',
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        {meta ? <span className="font-semibold text-ink-3">{meta}</span> : null}
        {action ? <span className="ml-auto shrink-0">{action}</span> : null}
      </Component>
    );
  },
);

SectionHeader.displayName = 'SectionHeader';
