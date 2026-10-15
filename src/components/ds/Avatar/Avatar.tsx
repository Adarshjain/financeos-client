'use client';

import React, { forwardRef, useState } from 'react';

import { cn } from '../cn';

export type AvatarVariant = 'account' | 'person' | 'logo';
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: AvatarVariant;
  size?: AvatarSize;
  initials?: string;
  src?: string;
  alt?: string;
}

const variantStyles: Record<AvatarVariant, string> = {
  account: 'bg-canvas text-ink-2 rounded-ds-md',
  person: 'bg-brand-tint text-brand-strong rounded-ds-pill',
  logo: 'bg-brand text-on-brand rounded-ds-sm',
};

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-space-24 w-space-24 text-tab-label font-bold',
  md: 'h-control-md w-control-md text-label font-bold',
  lg: 'h-control-xl w-control-xl text-heading font-extrabold',
};

/**
 * Identity marks: rounded-square initials for accounts, circles for people,
 * the bank's own logo for institutions.
 *
 * Sizes: One scale for every variant: sm 24 (lists and pickers), md 32 (default), lg 44 (profile, account header).
 * The variant changes shape and fill, never the size.
 */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      children,
      className,
      variant = 'account',
      size = 'md',
      initials,
      src,
      alt,
      ...props
    },
    ref,
  ) => {
    const [imageError, setImageError] = useState(false);

    const normalizedSize: 'sm' | 'md' | 'lg' = size === 'xl' ? 'lg' : size;
    const displayInitials = initials ?? (typeof children === 'string' ? children : null);

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-text leading-none',
          'shrink-0 overflow-hidden select-none whitespace-nowrap',
          variantStyles[variant],
          sizeStyles[normalizedSize],
          className,
        )}
        {...props}
      >
        {src && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? displayInitials ?? 'Avatar'}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          displayInitials ?? children
        )}
      </span>
    );
  },
);

Avatar.displayName = 'Avatar';
