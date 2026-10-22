'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';

import { cn } from '../cn';

const REVEAL_FALLBACK_MS = 400;

export type RevealAxis = 'x' | 'y';

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the content is shown. Toggling animates its size and opacity. */
  open: boolean;
  /** Which size animates: y grows and shrinks the height (default), x the width */
  axis?: RevealAxis;
}

/**
 * Reveal: shows and hides content with an animation instead of a pop. The size animates between
 * 0fr and 1fr of a one-cell grid, with opacity, over dur-base. The children stay mounted while
 * closed (inert, so they cannot take focus or clicks). No animation under reduced motion.
 * Content is clipped only while closed or animating; once fully open it is visible, so focus rings are not cut.
 */
export const Reveal = forwardRef<HTMLDivElement, RevealProps>(
  (
    { open, axis = 'y', className, style, children, onTransitionEnd, ...props },
    ref
  ) => {
    // The `open` value whose transition last finished. Clipped unless open and settled as open, so a
    // closed-to-open flip is clipped on its first render, with no effect. Mounted open: nothing animates.
    const [settledAs, setSettledAs] = useState(open);
    const first = useRef(true);
    useEffect(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      // Fallback for when no transitionend fires (reduced motion removes the transition).
      const t = window.setTimeout(() => setSettledAs(open), REVEAL_FALLBACK_MS);
      return () => window.clearTimeout(t);
    }, [open]);

    return (
      <div
        ref={ref}
        onTransitionEnd={(e) => {
          onTransitionEnd?.(e);
          if (e.target === e.currentTarget) setSettledAs(open);
        }}
        aria-hidden={open ? undefined : true}
        inert={!open}
        className={cn(
          'grid transition-all duration-base motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={{
          ...(axis === 'x'
            ? { gridTemplateColumns: open ? '1fr' : '0fr' }
            : { gridTemplateRows: open ? '1fr' : '0fr' }),
          ...style,
        }}
        {...props}
      >
        <div
          className={cn(
            'min-h-0 min-w-0',
            open && settledAs ? 'overflow-visible' : 'overflow-hidden'
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

Reveal.displayName = 'Reveal';
