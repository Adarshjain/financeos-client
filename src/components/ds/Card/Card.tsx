import React, { forwardRef } from 'react';

import { cn } from '../cn';

export interface CardHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-space-10 px-space-16 pt-space-14 pb-space-10',
          className,
        )}
        {...props}
      >
        {children ? (
          children
        ) : (
          <>
            <div className="min-w-0">
              {title ? (
                <div className="font-text font-extrabold text-heading text-ink truncate">
                  {title}
                </div>
              ) : null}
              {subtitle ? (
                <div className="font-text font-medium text-label text-ink-3 truncate mt-space-2">
                  {subtitle}
                </div>
              ) : null}
            </div>
            {action ? (
              <div className="shrink-0 flex items-center">{action}</div>
            ) : null}
          </>
        )}
      </div>
    );
  },
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardTitle = forwardRef<HTMLDivElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'font-text font-extrabold text-heading text-ink truncate',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardTitle.displayName = 'CardTitle';

export interface CardSubtitleProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const CardSubtitle = forwardRef<HTMLDivElement, CardSubtitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'font-text font-medium text-label text-ink-3 truncate',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardSubtitle.displayName = 'CardSubtitle';

export interface CardRowProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardRow = forwardRef<HTMLDivElement, CardRowProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-space-12 py-space-10 px-space-16 border-t border-line-soft font-text text-body text-ink',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardRow.displayName = 'CardRow';

export interface CardSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const CardSection = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'font-text text-overline font-extrabold uppercase text-ink-4 py-space-6 px-space-14 bg-sunken border-t border-b border-line-soft first:border-t-0 select-none',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardSection.displayName = 'CardSection';

export interface CardEmptyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardEmpty = forwardRef<HTMLDivElement, CardEmptyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center gap-space-8 py-space-16 px-space-16 font-text text-body text-ink-3',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardEmpty.displayName = 'CardEmpty';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-space-8 flex-wrap font-text font-medium text-body text-ink-3 py-space-10 px-space-14 border-t border-line-soft',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardFooter.displayName = 'CardFooter';

export interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ title, subtitle, action, className, children, ...props }, ref) => {
    const hasHeader = Boolean(title || subtitle || action);

    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface border border-line rounded-ds-lg overflow-hidden min-w-0 w-full',
          className,
        )}
        {...props}
      >
        {hasHeader ? (
          <CardHeader title={title} subtitle={subtitle} action={action} />
        ) : null}
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
