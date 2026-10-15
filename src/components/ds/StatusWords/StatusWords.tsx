import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

export type StatusTone =
  | 'amber'
  | 'blue'
  | 'grey'
  | 'green'
  | 'review'
  | 'link'
  | 'provenance'
  | 'verified';

export interface StatusWordItem {
  tone: StatusTone;
  label: React.ReactNode;
  showIcon?: boolean;
}

export interface StatusWordProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  showIcon?: boolean;
  icon?: React.ReactNode;
}

export interface StatusWordsProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'prefix'> {
  items?: StatusWordItem[];
  prefix?: React.ReactNode;
  separator?: React.ReactNode;
}

function resolveTone(tone: StatusTone): 'amber' | 'blue' | 'grey' | 'green' {
  if (tone === 'review') return 'amber';
  if (tone === 'link') return 'blue';
  if (tone === 'provenance') return 'grey';
  if (tone === 'verified') return 'green';
  return tone;
}

export const StatusWord = forwardRef<HTMLSpanElement, StatusWordProps>(
  (
    {
      children,
      className,
      tone = 'grey',
      showIcon,
      icon,
      ...props
    },
    ref,
  ) => {
    const resolvedTone = resolveTone(tone);

    const toneClasses = {
      amber: 'text-warning font-bold',
      blue: 'text-info font-semibold inline-flex items-center gap-space-2 whitespace-nowrap',
      grey: 'text-ink-3 font-medium',
      green: 'text-positive-strong font-bold',
    }[resolvedTone];

    const shouldShowIcon =
      showIcon ?? (resolvedTone === 'blue' && icon === undefined);

    return (
      <span
        ref={ref}
        className={cn(
          'font-text text-caption leading-none select-none',
          toneClasses,
          className,
        )}
        {...props}
      >
        {shouldShowIcon ? (
          icon ?? <Icon name="link" size="sm" className="shrink-0" />
        ) : null}
        {children}
      </span>
    );
  },
);

StatusWord.displayName = 'StatusWord';

export const StatusWords = forwardRef<HTMLSpanElement, StatusWordsProps>(
  (
    {
      children,
      className,
      items,
      prefix,
      separator = ' · ',
      ...props
    },
    ref,
  ) => {
    const renderItems = () => {
      if (items && items.length > 0) {
        return items.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 ? (
              <span className="text-ink-4 select-none">{separator}</span>
            ) : null}
            <StatusWord tone={item.tone} showIcon={item.showIcon}>
              {item.label}
            </StatusWord>
          </React.Fragment>
        ));
      }

      const childArray = React.Children.toArray(children).filter(Boolean);
      return childArray.map((child, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 ? (
            <span className="text-ink-4 select-none">{separator}</span>
          ) : null}
          {child}
        </React.Fragment>
      ));
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex flex-wrap items-center gap-space-4 font-text text-caption text-ink-3',
          className,
        )}
        {...props}
      >
        {prefix ? (
          <>
            <span className="text-ink-3">{prefix}</span>
            <span className="text-ink-4 select-none">{separator}</span>
          </>
        ) : null}
        {renderItems()}
      </span>
    );
  },
);

StatusWords.displayName = 'StatusWords';
