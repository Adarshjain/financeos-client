'use client';

import React, { forwardRef, useEffect, useState } from 'react';

import { Badge } from '../Badge/Badge';
import { ActionButton } from '../Button/ActionButton';
import { Button, type ButtonVariant } from '../Button/Button';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

const EXIT_FALLBACK_MS = 400;

export interface SelectionBarAction {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  /** Renders the action as a link (the app's link through LinkProvider) with the same look; `onSelect` still runs on click. */
  href?: string;
  hint?: string;
  count?: number | string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Draws the action as a plain Button of this variant (page-action use); omitted keeps the bulk-action look. */
  variant?: Extract<ButtonVariant, 'primary' | 'secondary' | 'link' | 'danger' | 'danger-filled' | 'danger-link'>;
  loading?: boolean;
}

export interface SelectionBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Number selected. Omitted: no count, the bar is always open while mounted (page-action use). */
  count?: number;
  /** Under the count; without `count`, the leading content (a note, a Menu). */
  summary?: React.ReactNode;
  actions: SelectionBarAction[];
  /** Draws the × (and Esc while `count` is set) when given. */
  onClear?: () => void;
  onSelectAll?: () => void;
  selectAllLabel?: string;
  clearAriaLabel?: string;
}

/**
 * SelectionBar: bar that appears while items are selected in lists, or (without `count`) a plain page-action bar.
 * Shows count, summary line, and actions that apply to the selection.
 * Slides up from the bottom on enter and down on exit (the last content stays mounted while it leaves; `data-selection-bar` stays until it is gone); no motion under reduced motion.
 * Floating pill centred above list from desk up; docked full width to the bottom edge below desk, where it covers the tab bar, which hides while a SelectionBar is mounted (the `data-selection-bar` mark, read by TabBar's `with-selection-bar:` variant).
 */
export const SelectionBar = forwardRef<HTMLDivElement, SelectionBarProps>(
  (
    {
      count,
      summary: summaryProp,
      actions: actionsProp,
      onClear,
      onSelectAll: onSelectAllProp,
      selectAllLabel: selectAllLabelProp,
      clearAriaLabel = 'Clear selection',
      className,
      onAnimationEnd,
      ...props
    },
    ref,
  ) => {
    const counted = count !== undefined;
    const live = !counted || count > 0;
    // The last content shown while selected, kept so the exit animation plays on real content.
    const [lastShown, setLastShown] = useState({
      count,
      summary: summaryProp,
      actions: actionsProp,
      onSelectAll: onSelectAllProp,
      selectAllLabel: selectAllLabelProp,
    });
    if (
      live &&
      (lastShown.count !== count ||
        lastShown.summary !== summaryProp ||
        lastShown.actions !== actionsProp ||
        lastShown.onSelectAll !== onSelectAllProp ||
        lastShown.selectAllLabel !== selectAllLabelProp)
    ) {
      setLastShown({
        count,
        summary: summaryProp,
        actions: actionsProp,
        onSelectAll: onSelectAllProp,
        selectAllLabel: selectAllLabelProp,
      });
    }
    const shown = live
      ? {
          count,
          summary: summaryProp,
          actions: actionsProp,
          onSelectAll: onSelectAllProp,
          selectAllLabel: selectAllLabelProp,
        }
      : lastShown;
    const { summary, actions, onSelectAll, selectAllLabel } = shown;
    const shownCount = shown.count;
    const showClear = !!onClear;

    // True once the exit animation finished (or was never needed): the bar renders nothing.
    const [gone, setGone] = useState(!live);
    if (live && gone) setGone(false);
    useEffect(() => {
      if (live) return;
      // Fallback for when no animationend fires (reduced motion removes the animation).
      const t = window.setTimeout(() => setGone(true), EXIT_FALLBACK_MS);
      return () => window.clearTimeout(t);
    }, [live]);

    // Esc key clears selection
    useEffect(() => {
      if (!onClear || count === undefined || count <= 0) return;

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

    if (!live && gone) return null;

    return (
      <div
        ref={ref}
        data-selection-bar=""
        data-state={live ? 'open' : 'closed'}
        inert={!live}
        onAnimationEnd={(e) => {
          onAnimationEnd?.(e);
          if (e.target === e.currentTarget && !live) setGone(true);
        }}
        className={cn(
          'relative z-floating w-full',
          'data-open:animate-in data-open:slide-in-from-bottom data-open:duration-base',
          'data-closed:animate-out data-closed:slide-out-to-bottom data-closed:fill-mode-forwards data-closed:duration-base',
          'motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none motion-reduce:data-closed:hidden',
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'bg-surface glass:bg-glass-strong glass:backdrop-blur-glass glass:backdrop-saturate-glass border-line-strong shadow-up-1 desk:shadow-level-2 select-none text-body text-ink w-full desk:w-fit desk:mx-auto desk:border desk:rounded-ds-lg',
            'border-t rounded-t-ds-2xl',
            counted
              ? 'grid grid-cols-[auto_1fr_auto] items-center px-space-14 pt-space-10 pb-safe-12 desk:p-0'
              : 'flex flex-row items-center gap-space-8 px-space-14 pt-space-10 pb-safe-12',
            'desk:flex desk:flex-row desk:items-center desk:px-space-12 desk:py-space-8 desk:gap-space-8',
          )}
        >
          {/* Close button (×): column 1 on mobile, at the end on desktop */}
          {showClear ? (
          <Button
            type="button"
            size="md"
            variant="ghost"
            iconOnly
            aria-label={clearAriaLabel}
            onClick={onClear}
            className="text-ink-3 hover:bg-hover hover:text-ink shrink-0 col-start-1 order-1 desk:order-5"
          >
            <Icon name="close" size="sm" />
          </Button>
          ) : null}

          {/* Count and summary: column 2 on mobile, at the beginning on desktop */}
          {counted ? (
            <div className="flex flex-col leading-tight min-w-0 pr-space-4 desk:pr-0 col-start-2 order-2 desk:order-1">
              <b className="font-bold text-body text-ink tabular-nums truncate">
                {shownCount} selected
              </b>
              {summary ? (
                <span className="text-caption font-semibold text-ink-3 truncate">
                  {summary}
                </span>
              ) : null}
            </div>
          ) : summary ? (
            <div className="flex items-center gap-space-8 min-w-0 flex-1 desk:flex-none order-2 desk:order-1">
              {summary}
            </div>
          ) : null}

          {/* Select all link (if present): column 3 on mobile */}
          {onSelectAll ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="inline-flex items-center h-control-md px-space-8 text-label font-bold text-brand hover:underline hover:bg-transparent cursor-pointer shrink-0 col-start-3 justify-self-end order-3 desk:order-3"
            >
              {selectAllLabel ?? 'Select all'}
            </Button>
          ) : null}

          {/* Divider between count and actions on desktop */}
          <div
            className={cn('hidden w-px h-space-24 bg-line mx-space-2 desk:order-2', (counted || summary) && 'desk:block')}
            aria-hidden="true"
          />

          {/* Actions: row 2 grid on mobile, row flex on desktop */}
          <div
            className={cn(
              counted
                ? 'col-start-1 col-span-3 grid grid-flow-col auto-cols-fr gap-space-4 pt-space-8 border-t border-line-soft desk:border-t-0 desk:pt-0 desk:flex desk:items-center desk:gap-space-6 order-4 desk:order-4'
                : 'flex items-center gap-space-12 min-w-0 order-4',
              !counted && !summary && 'w-full justify-end',
            )}
          >
            {actions.map((act, idx) => {
              const isDanger = act.tone === 'danger';
              if (act.variant) {
                return (
                  <ActionButton
                    key={act.id ?? idx}
                    size="md"
                    variant={act.variant}
                    disabled={act.disabled}
                    loading={act.loading}
                    href={act.href}
                    onSelect={act.onSelect}
                    icon={act.icon}
                    className="min-w-0 shrink"
                  >
                    {act.label}
                  </ActionButton>
                );
              }
              return (
                <ActionButton
                  key={act.id ?? idx}
                  variant={isDanger ? 'danger' : 'secondary'}
                  disabled={act.disabled}
                  href={act.href}
                  onSelect={act.onSelect}
                  aria-label={
                    act.count !== undefined ? `${act.label} ${act.count}` : act.label
                  }
                  className={cn(
                    'border-0 bg-transparent desk:border desk:bg-surface h-auto desk:h-control-md flex flex-col desk:flex-row items-center justify-center p-space-8 desk:px-space-12 desk:py-0 rounded-ds-md text-label font-semibold cursor-pointer gap-space-2 desk:gap-space-6',
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
                  </span>
                  {act.count !== undefined ? (
                    <Badge variant="solid" shape="rounded" size="sm" className="max-desk:hidden">
                      {act.count}
                    </Badge>
                  ) : null}
                  {act.hint ? (
                    <span
                      className={cn(
                        'text-micro font-semibold text-ink-4 not-italic truncate max-w-full leading-none',
                        // Desktop shows only a disabled action's hint (its reason); phone shows every hint.
                        !act.disabled && 'desk:hidden',
                      )}
                    >
                      {act.hint}
                    </span>
                  ) : null}
                </ActionButton>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

SelectionBar.displayName = 'SelectionBar';
