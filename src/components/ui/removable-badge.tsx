'use client';

import { X } from 'lucide-react';
import * as React from 'react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RemovableBadgeProps extends Omit<BadgeProps, 'onClick'> {
  /** Visible text describing the active filter. */
  label: React.ReactNode;
  /** Announced to assistive tech; defaults to "Remove filter". */
  removeLabel?: string;
  onRemove: () => void;
}

/**
 * An active-filter chip that can be dismissed by mouse OR keyboard.
 *
 * `Badge` renders a plain `<div>`, so the filter bars' dismissable chips were
 * click-only: keyboard users could reach the trailing "Clear all" button but had
 * no way to remove an individual filter. Rendering a real `<button>` inside the
 * badge gives native focus, Enter/Space activation and an accessible name,
 * rather than reimplementing those with role/tabIndex/onKeyDown.
 */
export function RemovableBadge({
  label,
  removeLabel,
  onRemove,
  className,
  variant,
  ...props
}: RemovableBadgeProps) {
  return (
    <Badge variant={variant} className={cn('p-0', className)} {...props}>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel ?? `Remove filter: ${typeof label === 'string' ? label : ''}`.trim()}
        className="inline-flex h-full w-full items-center gap-1 rounded-full px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <span>{label}</span>
        <X className="h-3 w-3 opacity-60" />
      </button>
    </Badge>
  );
}
