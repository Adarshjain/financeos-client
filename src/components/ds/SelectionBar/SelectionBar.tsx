import { X } from 'lucide-react';
import React, { forwardRef, useEffect } from 'react';

import { cn } from '../cn';

export interface SelectionBarAction {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  hint?: string;
  count?: number | string;
  variant?: 'default' | 'danger';
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
  variant?: 'desktop' | 'phone' | 'auto';
  clearAriaLabel?: string;
}

/**
 * SelectionBar: bar that appears while items are selected in lists.
 * Shows count, summary line, and actions that apply to the selection.
 * Desktop: floating pill centred above list (Esc clears).
 * Phone: docked to bottom edge like a sheet (tab bar hidden).
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
      variant = 'auto',
      clearAriaLabel = 'Clear selection',
      className,
      ...props
    },
    ref,
  ) => {
    // Esc key clears selection
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClear();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClear]);

    if (count <= 0) return null;

    const renderDesktop = () => (
      <div
        className={cn(
          'flex items-center gap-space-8 px-space-12 py-space-8 bg-surface border border-line-strong rounded-ds-lg shadow-pop select-none text-body text-ink',
          className,
        )}
      >
        <div className="flex flex-col leading-tight">
          <b className="font-bold text-body text-ink tabular-nums">
            {count} selected
          </b>
          {summary ? (
            <span className="text-caption font-semibold text-ink-3">
              {summary}
            </span>
          ) : null}
        </div>

        <div className="w-px h-space-24 bg-line mx-space-2" aria-hidden="true" />

        <div className="flex items-center gap-space-6">
          {actions.map((act, idx) => {
            const isDanger = act.variant === 'danger';
            return (
              <button
                key={act.id ?? idx}
                type="button"
                aria-label={act.count !== undefined ? `${act.label} ${act.count}` : act.label}
                disabled={act.disabled}
                onClick={act.onClick}
                className={cn(
                  'inline-flex items-center gap-space-6 h-control-md px-space-12 rounded-ds-md border font-semibold text-label transition-colors duration-fast cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                  act.disabled && 'opacity-45 cursor-not-allowed pointer-events-none',
                  isDanger
                    ? 'text-danger border-danger-border bg-surface hover:bg-danger-tint active:bg-danger-tint'
                    : 'text-ink border-line-strong bg-surface hover:bg-hover active:bg-hover',
                )}
              >
                {act.icon ? (
                  <span className="w-space-14 h-space-14 shrink-0 flex items-center justify-center">
                    {act.icon}
                  </span>
                ) : null}
                <span>{act.label}</span>
                {act.count !== undefined ? (
                  <span className="ml-space-2 tabular-nums font-bold">
                    {' '}{act.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label={clearAriaLabel}
          onClick={onClear}
          className="w-control-md h-control-md rounded-ds-md border-0 bg-transparent text-ink-3 hover:bg-hover hover:text-ink flex items-center justify-center cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <X className="w-space-16 h-space-16" aria-hidden="true" />
        </button>
      </div>
    );

    const renderPhone = () => {
      const colStyle = {
        gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))`,
      };

      return (
        <div
          className={cn(
            'flex flex-col items-stretch bg-surface border-t border-line-strong rounded-t-ds-sheet shadow-dock select-none text-body text-ink w-full',
            className,
          )}
        >
          {/* Top row */}
          <div className="flex items-center gap-space-10 px-space-14 pt-space-10 pb-space-8 border-b border-line-soft">
            <button
              type="button"
              aria-label={clearAriaLabel}
              onClick={onClear}
              className="w-control-md h-control-md rounded-ds-md border-0 bg-transparent text-ink-3 hover:bg-hover hover:text-ink flex items-center justify-center cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
            >
              <X className="w-space-16 h-space-16" aria-hidden="true" />
            </button>

            <div className="flex-1 flex flex-col leading-tight min-w-0 pr-space-4">
              <b className="font-bold text-body text-ink tabular-nums truncate">
                {count} selected
              </b>
              {summary ? (
                <span className="text-caption font-semibold text-ink-3 truncate">
                  {summary}
                </span>
              ) : null}
            </div>

            {onSelectAll ? (
              <button
                type="button"
                onClick={onSelectAll}
                className="text-label font-bold text-brand hover:underline cursor-pointer shrink-0 bg-transparent border-0 p-0"
              >
                {selectAllLabel ?? 'Select all'}
              </button>
            ) : null}
          </div>

          {/* Action buttons */}
          <div
            className="grid px-space-6 pt-space-4 pb-space-12 gap-space-4"
            style={colStyle}
          >
            {actions.map((act, idx) => {
              const isDanger = act.variant === 'danger';
              return (
                <button
                  key={act.id ?? idx}
                  type="button"
                  disabled={act.disabled}
                  onClick={act.onClick}
                  className={cn(
                    'flex flex-col items-center justify-center p-space-8 rounded-ds-md border-0 text-caption font-semibold cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring gap-space-2',
                    act.disabled && 'opacity-45 cursor-not-allowed pointer-events-none',
                    isDanger
                      ? 'text-danger hover:bg-danger-tint'
                      : 'text-ink hover:bg-hover',
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
                    <span className="text-tab-label font-semibold text-ink-4 not-italic truncate max-w-full leading-none">
                      {act.hint}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      );
    };

    if (variant === 'desktop') {
      return (
        <div ref={ref} {...props}>
          {renderDesktop()}
        </div>
      );
    }

    if (variant === 'phone') {
      return (
        <div ref={ref} {...props}>
          {renderPhone()}
        </div>
      );
    }

    // Auto responsive
    return (
      <div ref={ref} {...props}>
        <div className="hidden sm:block">{renderDesktop()}</div>
        <div className="block sm:hidden">{renderPhone()}</div>
      </div>
    );
  },
);
SelectionBar.displayName = 'SelectionBar';
