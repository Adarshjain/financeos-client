'use client';

import React, { createContext, forwardRef, useContext, useRef } from 'react';

import { Card } from '../Card/Card';
import { cn } from '../cn';
import { Text } from '../Text/Text';
import { useControllableState } from '../useControllableState';

interface ChoiceCardContextValue {
  value: string | undefined;
  select: (value: string) => void;
}

const ChoiceCardContext = createContext<ChoiceCardContextValue | null>(null);

export interface ChoiceCardGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

/**
 * ChoiceCard.Group: owns the chosen value. Arrow keys move the choice between enabled cards
 * (roving tab stop, like a radio group); `className` places the cards (the page sets the grid).
 */
export const ChoiceCardGroup = forwardRef<HTMLDivElement, ChoiceCardGroupProps>(
  ({ value, defaultValue, onValueChange, className, children, onKeyDown, ...props }, ref) => {
    const [current, setCurrent] = useControllableState<string | undefined>({
      value,
      defaultValue,
      onChange: onValueChange as ((v: string | undefined) => void) | undefined,
    });
    const innerRef = useRef<HTMLDivElement | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
      const backward = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
      if (!forward && !backward) return;
      const items = Array.from(
        innerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)') ?? [],
      );
      if (items.length === 0) return;
      const index = items.findIndex((el) => el === document.activeElement);
      const next = items[(index + (forward ? 1 : -1) + items.length) % items.length];
      e.preventDefault();
      next.focus();
      next.click();
    };

    return (
      <ChoiceCardContext.Provider value={{ value: current, select: setCurrent }}>
        <div
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          role="radiogroup"
          className={cn('grid gap-space-10', className)}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {children}
        </div>
      </ChoiceCardContext.Provider>
    );
  },
);

ChoiceCardGroup.displayName = 'ChoiceCard.Group';

export interface ChoiceCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'value' | 'role'> {
  value: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  disabled?: boolean;
}

const ChoiceCardItem = forwardRef<HTMLButtonElement, ChoiceCardProps>(
  ({ value, title, description, meta, disabled = false, className, onClick, ...props }, ref) => {
    const group = useContext(ChoiceCardContext);
    const checked = group?.value === value;
    // Roving tab stop: only the chosen card is tabbable; while nothing is chosen every enabled card is.
    const tone = disabled ? 'ink-4' : undefined;
    const toneMuted = disabled ? 'ink-4' : 'ink-3';

    return (
      <Card asChild selected={checked}>
        <button // ds-allow: radio-role choice tile, not a Button variant (owner exception, 2026-10-25)
          ref={ref}
          type="button"
          role="radio"
          aria-checked={checked}
          data-state={checked ? 'checked' : 'unchecked'}
          disabled={disabled}
          tabIndex={checked || (group?.value === undefined && !disabled) ? 0 : -1}
          onClick={(e) => {
            onClick?.(e);
            if (e.defaultPrevented || disabled) return;
            group?.select(value);
          }}
          className={cn(
            'flex flex-col items-start gap-space-4 p-space-12 text-left font-text transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
            'disabled:cursor-not-allowed disabled:hover:bg-surface disabled:active:bg-surface',
            className,
          )}
          {...props}
        >
          <Text variant="body-strong" tone={tone}>
            {title}
          </Text>
          {description ? (
            <Text variant="caption" tone={toneMuted}>
              {description}
            </Text>
          ) : null}
          {meta ? (
            <Text variant="caption" tone={toneMuted} className="mt-auto pt-space-4">
              {meta}
            </Text>
          ) : null}
        </button>
      </Card>
    );
  },
);

ChoiceCardItem.displayName = 'ChoiceCard';

export const ChoiceCard = Object.assign(ChoiceCardItem, { Group: ChoiceCardGroup });
