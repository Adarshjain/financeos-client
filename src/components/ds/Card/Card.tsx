'use client';

import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { SectionHeader } from '../SectionHeader/SectionHeader';
import { Text } from '../Text/Text';

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
              {title ? <CardTitle>{title}</CardTitle> : null}
              {subtitle ? <CardSubtitle>{subtitle}</CardSubtitle> : null}
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

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  truncate?: boolean;
}

export const CardTitle = forwardRef<HTMLElement, CardTitleProps>(
  ({ as = 'div', truncate = true, className, children, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        as={as}
        variant="heading"
        className={cn(
          'font-extrabold text-ink',
          truncate && 'truncate',
          className,
        )}
        {...props}
      >
        {children}
      </Text>
    );
  },
);

CardTitle.displayName = 'CardTitle';

export interface CardSubtitleProps
  extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  truncate?: boolean;
}

export const CardSubtitle = forwardRef<HTMLElement, CardSubtitleProps>(
  ({ as = 'div', truncate = true, className, children, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        as={as}
        variant="label"
        tone="ink-3"
        className={cn(
          'font-medium mt-space-2',
          truncate && 'truncate',
          className,
        )}
        {...props}
      >
        {children}
      </Text>
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
  extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
}

export const CardSection = forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, children, label, ...props }, ref) => {
    return (
      <SectionHeader
        ref={ref}
        variant="band"
        className={cn('first:border-t-0', className)}
        {...props}
      >
        {label ?? children}
      </SectionHeader>
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
          'flex items-center justify-between gap-space-8 flex-wrap font-text font-medium text-body text-ink-3 py-space-10 px-space-16 border-t border-line-soft',
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
  asChild?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      subtitle,
      action,
      asChild = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const hasHeader = Boolean(title || subtitle || action);
    const Comp = asChild ? Slot : 'div';

    return (
      <Comp
        ref={ref}
        className={cn(
          'bg-surface border border-line rounded-ds-lg overflow-clip min-w-0',
          className,
        )}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {hasHeader ? (
              <CardHeader title={title} subtitle={subtitle} action={action} />
            ) : null}
            {children}
          </>
        )}
      </Comp>
    );
  },
);

Card.displayName = 'Card';
