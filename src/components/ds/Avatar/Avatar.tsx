import React, { forwardRef, useState } from 'react';

import { cn } from '../cn';

export type AvatarVariant = 'account' | 'person' | 'logo';
export type AvatarSize = 'sm' | 'md' | 'xl';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: AvatarVariant;
  size?: AvatarSize;
  initials?: string;
  src?: string;
  alt?: string;
}

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

    const variantStyles = {
      account: 'bg-canvas text-ink-2 rounded-ds-md',
      person: 'bg-brand-tint text-brand-strong rounded-ds-pill',
      logo: 'bg-brand text-on-brand rounded-ds-sm',
    }[variant];

    const sizeStyles = {
      sm: {
        account: 'h-space-24 aspect-square text-caption',
        person: 'h-space-24 aspect-square text-caption',
        logo: 'h-space-20 aspect-square text-overline',
      },
      md: {
        account: 'h-control-md aspect-square text-label',
        person: 'h-space-28 aspect-square text-caption',
        logo: 'h-space-24 aspect-square text-caption',
      },
      xl: {
        account: 'h-control-xl aspect-square text-heading',
        person: 'h-control-xl aspect-square text-heading',
        logo: 'h-control-xl aspect-square text-heading',
      },
    }[size][variant];

    const displayInitials = initials ?? (typeof children === 'string' ? children : null);

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-text font-extrabold leading-none',
          'shrink-0 overflow-hidden select-none whitespace-nowrap',
          variantStyles,
          sizeStyles,
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
