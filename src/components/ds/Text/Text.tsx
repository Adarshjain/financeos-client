import React, { forwardRef } from 'react';

import { cn } from '../cn';
import { Conceal } from '../Conceal/Conceal';
import { concealMoney } from '../Conceal/concealMoney';

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
  | 'micro';

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
export type TextFraction = 'small';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  tone?: TextTone;
  as?: React.ElementType;
  family?: TextFamily;
  align?: TextAlign;
  truncate?: boolean;
  mono?: boolean;
  fraction?: TextFraction;
}

/** One step smaller on the existing scale, for the part after the decimal point. */
const fractionVariantStyles: Partial<Record<TextVariant, string>> = {
  'hero-figure': 'text-figure',
  figure: 'text-title',
  title: 'text-heading',
  heading: 'text-label',
  body: 'text-label',
  'body-strong': 'text-label',
  label: 'text-caption',
};

/** Tones that stay as they are on the fraction; every other tone is muted to ink-3. */
const fractionKeepTones: TextTone[] = ['positive', 'danger', 'ink-3', 'ink-4'];

function renderFraction(
  children: React.ReactNode,
  variant: TextVariant,
  tone: TextTone,
): React.ReactNode {
  if (typeof children !== 'string' && typeof children !== 'number') return children;
  const text = String(children);
  const at = text.lastIndexOf('.');
  const smaller = fractionVariantStyles[variant];
  if (at < 0 || !smaller) return children;
  return (
    <>
      {text.slice(0, at)}
      <span
        data-fraction=""
        className={cn(smaller, !fractionKeepTones.includes(tone) && 'text-ink-3')}
      >
        {text.slice(at)}
      </span>
    </>
  );
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
  'micro': 'text-micro',
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
      family,
      align,
      truncate = false,
      mono = false,
      fraction,
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
          family && familyStyles[family],
          mono && 'font-mono',
          align && alignStyles[align],
          truncate && 'truncate',
          className,
        )}
        {...props}
      >
        {fraction === 'small' ? (
          <Conceal whole value={typeof children === 'string' || typeof children === 'number' ? children : undefined}>
            {renderFraction(children, variant, tone)}
          </Conceal>
        ) : (
          concealMoney(children)
        )}
      </Component>
    );
  },
);

Text.displayName = 'Text';
