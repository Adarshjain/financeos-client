'use client';

import React, { forwardRef, useState } from 'react';

import { cn } from '../cn';

export type AvatarVariant = 'rounded' | 'circle' | 'square';
export type AvatarTone = 'neutral' | 'brand' | 'inverse';
export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: AvatarVariant;
  tone?: AvatarTone;
  size?: AvatarSize;
  initials?: string;
  src?: string;
  alt?: string;
  imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
}

const variantStyles: Record<AvatarVariant, string> = {
  rounded: 'rounded-ds-md',
  circle: 'rounded-ds-pill',
  square: 'rounded-ds-sm',
};

const toneStyles: Record<AvatarTone, string> = {
  neutral: 'bg-canvas text-ink-2',
  brand: 'bg-brand-tint text-brand-strong',
  inverse: 'bg-brand text-on-brand',
};

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-space-24 w-space-24 text-micro font-bold',
  md: 'h-control-md w-control-md text-label font-bold',
  lg: 'h-control-xl w-control-xl text-heading font-extrabold',
};

/**
 * Identity marks: rounded-square initials for accounts, circles for people,
 * the bank's own logo for institutions.
 */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      children,
      className,
      variant = 'rounded',
      tone = 'neutral',
      size = 'md',
      initials,
      src,
      alt,
      imgProps,
      ...props
    },
    ref,
  ) => {
    const [prevSrc, setPrevSrc] = useState(src);
    const [imageError, setImageError] = useState(false);

    if (prevSrc !== src) {
      setPrevSrc(src);
      setImageError(false);
    }

    const displayInitials = initials ?? (typeof children === 'string' ? children : null);

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-text leading-none',
          'shrink-0 overflow-hidden select-none whitespace-nowrap',
          variantStyles[variant],
          toneStyles[tone],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {src && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={alt ?? displayInitials ?? 'Avatar'}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
            {...imgProps}
          />
        ) : (
          displayInitials ?? children
        )}
      </span>
    );
  },
);

Avatar.displayName = 'Avatar';
