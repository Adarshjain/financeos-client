import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/registry';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success';

export interface StatusWordItem {
  tone?: StatusTone;
  label: React.ReactNode;
  icon?: IconName;
}

export interface StatusWordProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  icon?: IconName;
}

export interface StatusWordsProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'prefix'> {
  items?: StatusWordItem[];
  prefix?: React.ReactNode;
  separator?: React.ReactNode;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'text-ink-3 font-medium',
  info: 'text-info font-semibold',
  warning: 'text-warning font-bold',
  success: 'text-positive-strong font-bold',
};

export const StatusWord = forwardRef<HTMLSpanElement, StatusWordProps>(
  (
    {
      children,
      className,
      tone = 'neutral',
      icon,
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-space-2 whitespace-nowrap font-text text-caption leading-none select-none',
          TONE_CLASSES[tone],
          className,
        )}
        {...props}
      >
        {icon ? (
          <Icon name={icon} size="sm" className="shrink-0" />
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
            <StatusWord tone={item.tone} icon={item.icon}>
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
