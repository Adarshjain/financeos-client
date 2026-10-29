'use client';

import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { Badge } from '../Badge/Badge';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { capCount } from '../utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'danger-filled'
  | 'ghost'
  | 'link'
  | 'danger-ghost'
  | 'danger-link';

export type ButtonLayout = 'inline' | 'stacked';
export type ButtonSize = 'sm' | 'md' | 'xl';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  layout?: ButtonLayout;
  fullWidth?: boolean;
  iconOnly?: boolean;
  loading?: boolean;
  loadingLabel?: React.ReactNode;
  count?: number | string;
  dot?: boolean;
  icon?: React.ReactNode;
  asChild?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-brand text-on-brand hover:bg-brand-hover active:bg-brand-pressed',
  secondary:
    'border border-line-strong bg-surface text-ink hover:bg-hover active:bg-pressed',
  danger:
    'border border-danger-border bg-surface text-danger hover:bg-danger-tint active:bg-danger-tint active:border-danger',
  'danger-filled':
    'border border-transparent bg-danger text-on-brand hover:bg-danger-hover active:bg-danger-pressed',
  ghost:
    'border border-transparent bg-transparent text-ink hover:bg-hover active:bg-pressed',
  'danger-ghost':
    'border border-transparent bg-transparent text-danger hover:bg-hover hover:text-danger-hover active:bg-pressed active:text-danger-pressed',
  link:
    'border-0 bg-transparent text-inherit underline underline-offset-2 hover:no-underline active:opacity-80 p-0 h-auto font-bold inline',
  'danger-link':
    'border-0 bg-transparent text-danger underline underline-offset-2 hover:no-underline hover:text-danger-hover active:text-danger-pressed p-0 h-auto font-bold inline',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'secondary',
      size: sizeProp,
      layout = 'inline',
      fullWidth = false,
      iconOnly = false,
      loading = false,
      loadingLabel,
      count,
      dot = false,
      icon,
      disabled,
      asChild = false,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isLink = variant === 'link' || variant === 'danger-link';
    const size: ButtonSize = sizeProp ?? 'md';
    const asChildContent = asChild && React.isValidElement(children)
      ? (children as React.ReactElement<{ children?: React.ReactNode }>).props.children
      : children;
    const hasIconContent =
      Boolean(icon) ||
      React.Children.toArray(asChildContent).some((c) => React.isValidElement(c));
    // A link with an icon draws one continuous underline (pseudo element)
    // under icon + gap + text; text-decoration would stop at the SVG.
    const isIconLink = isLink && !iconOnly && hasIconContent;
    const isStacked = layout === 'stacked';
    // The underline hugs this wrapper (icon + gap + text), so a stretched button never underlines its empty space.
    const withUnderline = (content: React.ReactNode) =>
      isIconLink ? (
        <span
          data-underline=""
          className="relative inline-flex items-center gap-space-2 whitespace-nowrap after:absolute after:inset-x-0 after:bottom-space-2 after:h-px after:bg-line-heavy group-hover/link:after:hidden"
        >
          {content}
        </span>
      ) : (
        content
      );
    const isEffectivelyDisabled = disabled || loading;
    const isPrimary = variant === 'primary';

    // Links carry no height or padding: `size` only sets their text (sm = label, md/xl = body).
    // Without a `size` a link inherits the text around it.
    const sizeClasses = isLink
      ? sizeProp === 'sm'
        ? 'text-label'
        : sizeProp
          ? 'text-body'
          : ''
      : isStacked
        ? 'h-space-64 px-space-8 py-space-8 gap-space-4 rounded-ds-lg text-label font-semibold flex-col items-center justify-center text-center'
        : {
            sm: iconOnly
              ? 'h-control-sm aspect-square p-0 rounded-ds-sm'
              : 'h-control-sm px-space-8 text-label rounded-ds-sm gap-space-4',
            md: iconOnly
              ? 'h-control-md aspect-square p-0 rounded-ds-md'
              : 'h-control-md px-space-12 text-label rounded-ds-md gap-space-6',
            xl: iconOnly
              ? 'h-control-xl aspect-square p-0 rounded-ds-lg'
              : 'h-control-xl px-space-16 text-label rounded-ds-lg gap-space-8',
          }[size];

    const classes = cn(
      isLink
        ? 'inline font-text font-bold underline decoration-line-heavy underline-offset-2 transition-colors duration-fast select-none cursor-pointer disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2'
        : 'inline-flex items-center justify-center font-text whitespace-nowrap transition-colors duration-fast select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 disabled:opacity-45 disabled:pointer-events-none cursor-pointer font-semibold',
      sizeClasses,
      variantStyles[variant],
      isIconLink && 'group/link no-underline inline-flex items-center justify-center',
      // Link icons follow the surrounding text: always 2px under its font size, whatever size the Icon was given.
      isLink && '[&_svg]:size-icon-inline',
      dot && 'relative',
      fullWidth && 'w-full',
      isEffectivelyDisabled && 'opacity-45 pointer-events-none',
      className,
    );

    if (asChild) {
      if (React.isValidElement(children)) {
        const child = children as React.ReactElement<{ children?: React.ReactNode }>;
        const childContent = loading ? (
          <>
            <Icon
              name="spinner"
              data-testid="spinner-icon"
              size={size === 'sm' ? 'sm' : 'md'}
              className="animate-spin shrink-0"
            />
            {loadingLabel ? (
              <span>{loadingLabel}</span>
            ) : !iconOnly && child.props.children ? (
              <span>{child.props.children}</span>
            ) : null}
          </>
        ) : (
          <>
            {withUnderline(
              <>
                {icon ? (
                  <span className="inline-flex items-center justify-center shrink-0">
                    {icon}
                  </span>
                ) : null}
                {child.props.children}
              </>,
            )}
            {count !== undefined && count !== null ? (
              <Badge
                variant="solid"
                shape="rounded"
                size="sm"
                className={isPrimary ? 'bg-surface text-ink' : undefined}
              >
                {capCount(count)}
              </Badge>
            ) : null}
            {dot ? (
              <Badge
                variant="dot"
                tone="danger"
                data-testid="button-dot"
                className="absolute top-space-4 right-space-4"
              />
            ) : null}
          </>
        );

        return (
          <Slot
            ref={ref}
            className={classes}
            data-disabled={isEffectivelyDisabled ? true : undefined}
            aria-disabled={isEffectivelyDisabled ? true : undefined}
            aria-busy={loading ? true : undefined}
            {...props}
          >
            {React.cloneElement(child, {}, childContent)}
          </Slot>
        );
      }

      return (
        <Slot
          ref={ref}
          className={classes}
          data-disabled={isEffectivelyDisabled ? true : undefined}
          aria-disabled={isEffectivelyDisabled ? true : undefined}
          aria-busy={loading ? true : undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={isEffectivelyDisabled}
        aria-busy={loading ? 'true' : undefined}
        {...props}
      >
        {loading ? (
          <>
            <Icon
              name="spinner"
              data-testid="spinner-icon"
              size={size === 'sm' ? 'sm' : 'md'}
              className="animate-spin shrink-0"
            />
            {loadingLabel ? (
              <span>{loadingLabel}</span>
            ) : !iconOnly && children ? (
              <span>{children}</span>
            ) : null}
          </>
        ) : (
          <>
            {withUnderline(
              <>
                {icon ? (
                  <span className="inline-flex items-center justify-center shrink-0">
                    {icon}
                  </span>
                ) : null}
                {children}
              </>,
            )}
            {count !== undefined && count !== null ? (
              <Badge
                variant="solid"
                shape="rounded"
                size="sm"
                className={isPrimary ? 'bg-surface text-ink' : undefined}
              >
                {capCount(count)}
              </Badge>
            ) : null}
            {dot ? (
              <Badge
                variant="dot"
                tone="danger"
                data-testid="button-dot"
                className="absolute top-space-4 right-space-4"
              />
            ) : null}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
