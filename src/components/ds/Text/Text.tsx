import React, { forwardRef } from 'react';

import { cn } from '../cn';

export type TextVariant =
  | 'hero-figure'
  | 'page-title'
  | 'screen-title'
  | 'figure'
  | 'title'
  | 'heading'
  | 'body'
  | 'body-strong'
  | 'label'
  | 'caption'
  | 'overline'
  | 'tab-label';

export type TextTone =
  | 'ink'
  | 'ink-2'
  | 'ink-3'
  | 'ink-4'
  | 'positive'
  | 'danger'
  | 'warning'
  | 'info';

export type TextFamily = 'text' | 'display';
export type TextAlign = 'start' | 'center' | 'end';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  tone?: TextTone;
  as?: React.ElementType;
  family?: TextFamily;
  align?: TextAlign;
  truncate?: boolean;
}

const variantStyles: Record<TextVariant, string> = {
  'hero-figure': 'text-hero-figure',
  'page-title': 'text-page-title',
  'screen-title': 'text-screen-title',
  figure: 'text-figure',
  title: 'text-title',
  heading: 'text-heading',
  body: 'text-body',
  'body-strong': 'text-body-strong',
  label: 'text-label',
  caption: 'text-caption',
  overline: 'text-overline uppercase',
  'tab-label': 'text-tab-label',
};

const toneStyles: Record<TextTone, string> = {
  ink: 'text-ink',
  'ink-2': 'text-ink-2',
  'ink-3': 'text-ink-3',
  'ink-4': 'text-ink-4',
  positive: 'text-positive',
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

const familyStyles: Record<TextFamily, string> = {
  text: 'font-text',
  display: 'font-display',
};

const alignStyles: Record<TextAlign, string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
};

/**
 * Text renders plain text with Dinero type styles and tones.
 * It is a server component without hooks.
 */
export const Text = forwardRef<HTMLElement, TextProps>(
  (
    {
      as: Component = 'span',
      variant = 'body',
      tone = 'ink',
      family = 'text',
      align = 'start',
      truncate = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          variantStyles[variant],
          toneStyles[tone],
          familyStyles[family],
          alignStyles[align],
          truncate && 'truncate',
          className,
        )}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Text.displayName = 'Text';
