'use client';

import React, { forwardRef } from 'react';

import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../Menu/Menu';
import { StatusWords } from '../StatusWords/StatusWords';
import { useLongPress } from '../useLongPress';

export interface RuleCardMenuItem {
  label: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}

export interface RuleCardApproveAction {
  label?: string;
  onSelect?: () => void;
}

export interface RuleCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Rule title / merchant name, e.g. "Dunzo", "Swiggy" */
  name?: React.ReactNode;
  /** Match type, e.g. "Contains", "Starts with", "Exact" */
  matchType: React.ReactNode;
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

  /** Approve action (unverified cards) from props */
  approveAction?: RuleCardApproveAction;
  onApprove?: () => void;
  approveLabel?: string;
  /** Kebab menu options from props */
  menuItems?: RuleCardMenuItem[];

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
}

export const RuleCard = forwardRef<HTMLDivElement, RuleCardProps>(
  (
    {
      name,
      matchType,
      pattern,
      usedCount,
      status = 'unverified',
      source,
      mcc,
      statusLine,
      categories,
      categoryContent,
      approveAction,
      onApprove,
      approveLabel,
      menuItems,
      selectable,
      selected = false,
      onSelectedChange,
      selectionMode = false,
      onDetail,
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
    const isVerified = status === 'verified';

    const isSelectable = selectable ?? Boolean(onSelectedChange);
    const showEye =
      selectionMode ||
      ((selected || isSelectable) && Boolean(onDetail));

    // Long press detection for mobile (~450ms, cancelled on move > 10px)
    const longPress = useLongPress({
      onLongPress: () => onSelectedChange?.(true),
      disabled: !isSelectable && !selectionMode,
    });

    const effectiveApprove =
      approveAction ??
      (onApprove
        ? { onSelect: onApprove, label: approveLabel ?? 'Approve' }
        : undefined);

    const renderStatusLine = () => {
      if (statusLine) return statusLine;

      const items: { tone: 'success' | 'warning' | 'neutral'; label: React.ReactNode }[] = [
        {
          tone: isVerified ? 'success' : 'warning',
          label: isVerified ? 'Verified' : 'Unverified',
        },
      ];

      if (source) {
        items.push({ tone: 'neutral', label: source });
      }

      if (mcc) {
        items.push({ tone: 'neutral', label: mcc });
      }

      return <StatusWords items={items} />;
    };

    const renderActions = () => {
      if (showEye) {
        return (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            iconOnly
            onClick={(e) => {
              e.stopPropagation();
              onDetail?.();
            }}
            aria-label="View rule details"
            className="text-brand-strong shrink-0"
          >
            <Icon name="view" size="md" />
          </Button>
        );
      }

      const hasApprove = !isVerified && effectiveApprove?.onSelect;
      const hasMenu = menuItems && menuItems.length > 0;

      if (!hasApprove && !hasMenu) return null;

      return (
        <div className="flex items-center gap-space-6 shrink-0">
          {hasApprove && (
            <Button
              size="sm"
              variant="secondary"
              onClick={effectiveApprove.onSelect}
              icon={<Icon name="check" size="sm" />}
            >
              {effectiveApprove.label ?? 'Approve'}
            </Button>
          )}

          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  iconOnly
                  aria-label="Rule actions"
                >
                  <Icon name="more" size="sm" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuItems.map((item, idx) => (
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
          )}
        </div>
      );
    };

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (longPress.consumeTriggered()) {
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
          longPress.handlers.onTouchStart(e);
          onTouchStart?.(e);
        }}
        onTouchMove={(e) => {
          longPress.handlers.onTouchMove(e);
          onTouchMove?.(e);
        }}
        onTouchEnd={(e) => {
          longPress.handlers.onTouchEnd(e);
          onTouchEnd?.(e);
        }}
        onTouchCancel={(e) => {
          longPress.handlers.onTouchCancel(e);
          onTouchCancel?.(e);
        }}
        onPointerDown={(e) => {
          longPress.handlers.onPointerDown(e);
          onPointerDown?.(e);
        }}
        onPointerMove={(e) => {
          longPress.handlers.onPointerMove(e);
          onPointerMove?.(e);
        }}
        onPointerUp={(e) => {
          longPress.handlers.onPointerUp(e);
          onPointerUp?.(e);
        }}
        onPointerCancel={(e) => {
          longPress.handlers.onPointerCancel(e);
          onPointerCancel?.(e);
        }}
        {...props}
      >
        {/* Header: Desktop Checkbox + Name + Pattern, and used count */}
        <div className="flex gap-space-10 items-start justify-between">
          <div className="flex items-start gap-space-10 flex-1 min-w-0">
            {(isSelectable || selectionMode || selected) && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 mt-space-2 hidden lg:inline-flex"
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => {
                    onSelectedChange?.(checked === true);
                  }}
                  aria-label={
                    typeof name === 'string' ? `Select ${name}` : 'Select rule'
                  }
                />
              </div>
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
                <Badge
                  key={idx}
                  variant="outline"
                  shape="rounded"
                  className={selected ? 'bg-surface' : undefined}
                >
                  {cat}
                </Badge>
              ))}
          </div>
          {renderActions()}
        </div>
      </div>
    );
  },
);

RuleCard.displayName = 'RuleCard';
