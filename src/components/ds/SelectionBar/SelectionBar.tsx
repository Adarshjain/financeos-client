'use client';

import React, { forwardRef, useEffect } from 'react';

import { Button } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

export interface SelectionBarAction {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  hint?: string;
  count?: number | string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface SelectionBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  count: number;
  summary?: React.ReactNode;
  actions: SelectionBarAction[];
  onClear: () => void;
  onSelectAll?: () => void;
  selectAllLabel?: string;
  clearAriaLabel?: string;
}

/**
 * SelectionBar: bar that appears while items are selected in lists.
 * Shows count, summary line, and actions that apply to the selection.
 * Floating pill centred above list from lg up; docked to bottom edge below lg.
 */
export const SelectionBar = forwardRef<HTMLDivElement, SelectionBarProps>(
  (
    {
      count,
      summary,
      actions,
      onClear,
      onSelectAll,
      selectAllLabel,
      clearAriaLabel = 'Clear selection',
      className,
      ...props
    },
    ref,
  ) => {
    // Esc key clears selection
    useEffect(() => {
      if (count <= 0) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.defaultPrevented) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          onClear();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [count, onClear]);

    if (count <= 0) return null;

    return (
      <div ref={ref} className={cn('relative w-full', className)} {...props}>
        <div
          className={cn(
            'bg-surface border-t lg:border border-line-strong rounded-t-ds-2xl lg:rounded-ds-lg shadow-up-1 lg:shadow-level-2 z-floating select-none text-body text-ink w-full lg:w-fit lg:mx-auto',
            'grid grid-cols-[auto_1fr_auto] items-center px-space-14 pt-space-10 pb-space-12 lg:p-0',
            'lg:flex lg:flex-row lg:items-center lg:px-space-12 lg:py-space-8 lg:gap-space-8',
          )}
        >
          {/* Close button (×): column 1 on mobile, at the end on desktop */}
          <Button
            type="button"
            size="md"
            variant="ghost"
            iconOnly
            aria-label={clearAriaLabel}
            onClick={onClear}
            className="text-ink-3 hover:bg-hover hover:text-ink shrink-0 col-start-1 order-1 lg:order-5"
          >
            <Icon name="close" size="sm" />
          </Button>

          {/* Count and summary: column 2 on mobile, at the beginning on desktop */}
          <div className="flex flex-col leading-tight min-w-0 pr-space-4 lg:pr-0 col-start-2 order-2 lg:order-1">
            <b className="font-bold text-body text-ink tabular-nums truncate">
              {count} selected
            </b>
            {summary ? (
              <span className="text-caption font-semibold text-ink-3 truncate">
                {summary}
              </span>
            ) : null}
          </div>

          {/* Select all link (if present): column 3 on mobile */}
          {onSelectAll ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="inline-flex items-center h-control-md px-space-8 text-label font-bold text-brand hover:underline hover:bg-transparent cursor-pointer shrink-0 col-start-3 justify-self-end order-3 lg:order-3"
            >
              {selectAllLabel ?? 'Select all'}
            </Button>
          ) : null}

          {/* Divider between count and actions on desktop */}
          <div
            className="hidden lg:block w-px h-space-24 bg-line mx-space-2 lg:order-2"
            aria-hidden="true"
          />

          {/* Actions: row 2 grid on mobile, row flex on desktop */}
          <div
            className="col-start-1 col-span-3 grid grid-flow-col auto-cols-fr gap-space-4 pt-space-8 border-t border-line-soft lg:border-t-0 lg:pt-0 lg:flex lg:items-center lg:gap-space-6 order-4 lg:order-4"
          >
            {actions.map((act, idx) => {
              const isDanger = act.tone === 'danger';
              return (
                <Button
                  key={act.id ?? idx}
                  type="button"
                  variant={isDanger ? 'danger' : 'secondary'}
                  disabled={act.disabled}
                  onClick={act.onSelect}
                  aria-label={
                    act.count !== undefined ? `${act.label} ${act.count}` : act.label
                  }
                  className={cn(
                    'border-0 bg-transparent lg:border lg:bg-surface h-auto lg:h-control-md flex flex-col lg:flex-row items-center justify-center p-space-8 lg:px-space-12 lg:py-0 rounded-ds-md text-caption lg:text-body font-semibold cursor-pointer gap-space-2 lg:gap-space-6',
                    act.disabled && 'opacity-45 cursor-not-allowed pointer-events-none',
                    isDanger
                      ? 'text-danger hover:bg-danger-tint active:bg-danger-tint'
                      : 'text-ink hover:bg-hover active:bg-hover',
                  )}
                >
                  {act.icon ? (
                    <span className="w-space-20 h-space-20 shrink-0 flex items-center justify-center">
                      {act.icon}
                    </span>
                  ) : null}
                  <span className="truncate max-w-full leading-tight">
                    {act.label}
                    {act.count !== undefined ? ` ${act.count}` : ''}
                  </span>
                  {act.hint ? (
                    <span className="text-micro font-semibold text-ink-4 not-italic truncate max-w-full leading-none lg:hidden">
                      {act.hint}
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

SelectionBar.displayName = 'SelectionBar';
