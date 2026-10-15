import { Check, Eye, MoreVertical } from 'lucide-react';
import React, { forwardRef, useRef } from 'react';

import { Button } from '../Button/Button';
import { CategoryChip } from '../CategoryChip/CategoryChip';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../Menu/Menu';
import { useIsPhone } from '../useMediaQuery';

export interface RuleCardMenuItem {
  label: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}

export interface RuleCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Rule title / merchant name, e.g. "Dunzo", "Swiggy" */
  name?: React.ReactNode;
  /** Match type, e.g. "Contains", "Starts with", "Exact" */
  matchType?: React.ReactNode;
  /** Match pattern string, e.g. "DUNZO DAILY", "SWIGGY" */
  pattern?: React.ReactNode;
  /** Usage count shown at top right, e.g. 4, 31, 1 */
  usedCount?: number | string;

  /** Verification status: 'unverified' (default, amber) or 'verified' (green/brand-strong) */
  status?: 'unverified' | 'verified';
  /** Provenance / source, e.g. "LLM-generated", "Created by you" */
  source?: React.ReactNode;
  /** MCC code, e.g. "MCC 5812" */
  mcc?: React.ReactNode;
  /** Custom status line override */
  statusLine?: React.ReactNode;

  /** Assigned categories */
  categories?: string[];
  /** Custom category elements */
  categoryContent?: React.ReactNode;

  /** Callback when Approve button is clicked (unverified cards) */
  onApprove?: () => void;
  /** Kebab menu options */
  menuItems?: RuleCardMenuItem[];
  /** Callback for "Find matches" */
  onFindMatches?: () => void;
  /** Callback for "Edit rule" */
  onEditRule?: () => void;
  /** Callback for "Delete rule" */
  onDeleteRule?: () => void;

  /** Whether the card is selectable */
  selectable?: boolean;
  /** Whether the card is selected */
  selected?: boolean;
  /** Callback when selection state changes */
  onSelectedChange?: (selected: boolean) => void;

  /** Selection mode (phone): shows trailing eye icon replacing Approve and kebab menu */
  selectionMode?: boolean;
  /** Callback when trailing eye icon is clicked in selection mode */
  onDetail?: () => void;
  /** Alias for onDetail */
  onViewDetail?: () => void;
}

export const RuleCard = forwardRef<HTMLDivElement, RuleCardProps>(
  (
    {
      name,
      matchType = 'Contains',
      pattern,
      usedCount,
      status = 'unverified',
      source,
      mcc,
      statusLine,
      categories,
      categoryContent,
      onApprove,
      menuItems,
      onFindMatches,
      onEditRule,
      onDeleteRule,
      selectable,
      selected = false,
      onSelectedChange,
      selectionMode = false,
      onDetail,
      onViewDetail,
      className,
      onClick,
      onKeyDown,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      children,
      ...props
    },
    ref,
  ) => {
    const isPhone = useIsPhone();
    const isVerified = status === 'verified';

    const isSelectable = selectable ?? Boolean(onSelectedChange);
    const showDesktopCheckbox =
      !isPhone && (isSelectable || selectionMode || selected);
    const showEye =
      selectionMode ||
      ((selected || isSelectable) && Boolean(onDetail || onViewDetail));

    // Long press detection for mobile (~450ms, cancelled on move > 10px)
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isLongPressTriggeredRef = useRef(false);

    const startLongPress = (clientX: number, clientY: number) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      isLongPressTriggeredRef.current = false;
      touchStartPosRef.current = { x: clientX, y: clientY };
      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        onSelectedChange?.(true);
      }, 450);
    };

    const cancelLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      touchStartPosRef.current = null;
    };

    const defaultMenuItems: RuleCardMenuItem[] = [
      { label: 'Find matches', onSelect: onFindMatches },
      { label: 'Edit rule', onSelect: onEditRule },
      { label: 'Delete rule', onSelect: onDeleteRule, destructive: true },
    ].filter((item) => Boolean(item.onSelect));

    const resolvedMenuItems =
      menuItems ??
      (defaultMenuItems.length > 0
        ? defaultMenuItems
        : [
            { label: 'Find matches', onSelect: () => {} },
            { label: 'Edit rule', onSelect: () => {} },
            { label: 'Delete rule', onSelect: () => {}, destructive: true },
          ]);

    const renderStatusLine = () => {
      if (statusLine) return statusLine;

      const parts: React.ReactNode[] = [];

      parts.push(
        isVerified ? (
          <span key="status" className="text-brand-strong font-bold">
            Verified
          </span>
        ) : (
          <span key="status" className="text-warning font-bold">
            Unverified
          </span>
        ),
      );

      if (source) {
        parts.push(<span key="source">{source}</span>);
      }

      if (mcc) {
        parts.push(<span key="mcc">{mcc}</span>);
      }

      return (
        <div className="text-label font-medium text-ink-3">
          {parts.map((part, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-ink-4 select-none"> · </span>}
              {part}
            </React.Fragment>
          ))}
        </div>
      );
    };

    const renderActions = () => {
      if (showEye) {
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              (onDetail ?? onViewDetail)?.();
            }}
            aria-label="View rule details"
            className="text-brand-strong inline-flex items-center justify-center p-space-2 rounded-ds-sm hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <Eye className="w-space-16 h-space-16" aria-hidden="true" />
          </button>
        );
      }

      return (
        <div className="flex items-center gap-space-6 shrink-0">
          {!isVerified && onApprove && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onApprove}
              icon={<Icon icon={Check} size="sm" />}
            >
              Approve
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                iconOnly
                aria-label="Rule actions"
              >
                <MoreVertical
                  className="w-space-14 h-space-14"
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {resolvedMenuItems.map((item, idx) => (
                <DropdownMenuItem
                  key={idx}
                  destructive={item.destructive}
                  onSelect={item.onSelect}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    };

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isLongPressTriggeredRef.current) {
        isLongPressTriggeredRef.current = false;
        return;
      }
      if (isSelectable || selectionMode || selected) {
        onSelectedChange?.(!selected);
      }
      onClick?.(e);
    };

    const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (isSelectable || selectionMode || selected) {
          onSelectedChange?.(!selected);
        } else {
          onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }
      onKeyDown?.(e);
    };

    const isInteractive = Boolean(
      onClick || isSelectable || selectionMode || onSelectedChange,
    );

    return (
      <div
        ref={ref}
        role={isSelectable ? 'checkbox' : isInteractive ? 'button' : undefined}
        aria-selected={isSelectable || selectionMode ? selected : undefined}
        aria-checked={isSelectable ? selected : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        className={cn(
          'border rounded-ds-xl px-space-14 py-space-12 flex flex-col gap-space-6 select-none transition-colors duration-fast w-full min-w-0',
          selected
            ? 'bg-brand-tint border-brand ring-1 ring-inset ring-brand'
            : 'bg-surface border-line',
          isInteractive && !selected && 'hover:border-line-strong cursor-pointer',
          isInteractive &&
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
          className,
        )}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            startLongPress(e.touches[0].clientX, e.touches[0].clientY);
          }
          onTouchStart?.(e);
        }}
        onTouchMove={(e) => {
          if (touchStartPosRef.current && e.touches.length === 1) {
            const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
            const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
            if (dx > 10 || dy > 10) {
              cancelLongPress();
            }
          }
          onTouchMove?.(e);
        }}
        onTouchEnd={(e) => {
          cancelLongPress();
          onTouchEnd?.(e);
        }}
        onTouchCancel={(e) => {
          cancelLongPress();
          onTouchCancel?.(e);
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') {
            startLongPress(e.clientX, e.clientY);
          }
          onPointerDown?.(e);
        }}
        onPointerMove={(e) => {
          if (touchStartPosRef.current && e.pointerType === 'touch') {
            const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
            const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
            if (dx > 10 || dy > 10) {
              cancelLongPress();
            }
          }
          onPointerMove?.(e);
        }}
        onPointerUp={(e) => {
          cancelLongPress();
          onPointerUp?.(e);
        }}
        onPointerCancel={(e) => {
          cancelLongPress();
          onPointerCancel?.(e);
        }}
        {...props}
      >
        {/* Header: Desktop Checkbox + Name + Pattern, and used count */}
        <div className="flex gap-space-10 items-start justify-between">
          <div className="flex items-start gap-space-10 flex-1 min-w-0">
            {showDesktopCheckbox && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelectedChange?.(e.target.checked);
                }}
                aria-label={
                  typeof name === 'string' ? `Select ${name}` : 'Select rule'
                }
                className="accent-brand cursor-pointer w-space-16 h-space-16 rounded-ds-xs m-0 shrink-0 mt-space-2"
              />
            )}
            <div className="flex-1 min-w-0">
              {name && (
                <div className="text-heading font-extrabold text-ink break-words">
                  {name}
                </div>
              )}
              {(matchType || pattern) && (
                <div className="text-label font-medium text-ink-3">
                  {matchType}
                  {pattern && (
                    <>
                      {' · '}
                      <b className="text-ink-2 font-bold">{pattern}</b>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {usedCount !== undefined && (
            <span className="text-heading font-extrabold text-ink-2 px-space-4 tabular-nums shrink-0">
              {usedCount}
            </span>
          )}
        </div>

        {/* Status line */}
        {renderStatusLine()}

        {children}

        {/* Bottom row: Categories + Actions */}
        <div className="flex items-center gap-space-6 mt-space-2">
          <div className="flex-1 flex gap-space-6 flex-wrap">
            {categoryContent ??
              categories?.map((cat, idx) => (
                <CategoryChip
                  key={idx}
                  className={selected ? 'bg-surface' : undefined}
                >
                  {cat}
                </CategoryChip>
              ))}
          </div>
          {renderActions()}
        </div>
      </div>
    );
  },
);

RuleCard.displayName = 'RuleCard';
