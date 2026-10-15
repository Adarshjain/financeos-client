'use client';

import React, { forwardRef, useRef } from 'react';

import { Button } from '../Button/Button';
import { CategoryChip } from '../CategoryChip/CategoryChip';
import { Checkbox } from '../Checkbox/Checkbox';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';
import { StatusWord } from '../StatusWords/StatusWords';
import { SwipeActionItem, SwipeActions } from '../SwipeActions/SwipeActions';
import { useIsPhone } from '../useMediaQuery';

export type TransactionRowStatus =
  | 'default'
  | 'selected'
  | 'monitored'
  | 'excluded';

export interface TransactionLink {
  label: React.ReactNode;
  /** If true, this is a record link without chain glyph (e.g. EMI or loan), false/default shows chain glyph */
  isRecord?: boolean;
}

export interface TransactionRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Leading icon or logo tile (Avatar) */
  leading?: React.ReactNode;
  /** Merchant or main transaction description */
  description?: React.ReactNode;
  /** Formatted transaction amount, e.g. "3,600.00" or "+2,15,000.00" */
  amount?: React.ReactNode;
  /** Whether the amount is a credit (+ positive green). Auto-detected if amount starts with "+" */
  isCredit?: boolean;
  /** Optional running balance shown below amount, e.g. "bal ₹61,757" */
  balance?: React.ReactNode;

  /** Account name, e.g. "HDFC Bank Savings" or "HDFC Regalia" */
  account?: React.ReactNode;
  /** Card or plastic identifier, e.g. "••7741" */
  plastic?: React.ReactNode;
  /** Amber review status/word, e.g. "Duplicate", "Watching", "Unreconciled" */
  reviewStatus?: React.ReactNode;
  /** Note text */
  note?: React.ReactNode;
  /** Blue link or connected record, e.g. { label: "Transfer out" } or "Transfer out" */
  link?: string | TransactionLink;
  /** Grey provenance word, e.g. "Statement", "Gmail", "Manual", "Excluded" */
  provenance?: React.ReactNode;
  /** Custom context line override */
  contextLine?: React.ReactNode;

  /** Categories list: empty array renders dashed "Set category" chip, 1 renders chip, 2+ renders chip and +n count */
  categories?: string[];
  /** Custom category element override */
  category?: React.ReactNode;
  /** Callback when "Set category" is clicked */
  onSetCategory?: () => void;
  /** Callback when first category is clicked */
  onCategoryClick?: (category: string) => void;
  /** Callback when +n categories chip is clicked */
  onMoreCategoriesClick?: () => void;

  /** Row status: 'default' | 'selected' | 'monitored' | 'excluded' */
  status?: TransactionRowStatus;
  /** Whether row is selectable */
  selectable?: boolean;
  /** Shortcut for status="selected" or whether row is currently selected */
  selected?: boolean;
  /** Callback when selection state changes */
  onSelectedChange?: (selected: boolean) => void;
  /** Shortcut for status="monitored" */
  monitored?: boolean;
  /** Shortcut for status="excluded" */
  excluded?: boolean;

  /** Selection mode: displays trailing eye icon to view details */
  selectionMode?: boolean;
  /** Callback when trailing eye icon is clicked to view detail */
  onDetail?: () => void;
  /** Alias for onDetail */
  onViewDetail?: () => void;

  /** Trailing chevron indicator */
  chevron?: boolean;

  /** Swiping support */
  swipeable?: boolean;
  swipeLeft?: SwipeActionItem;
  swipeRight?: SwipeActionItem;
  onApprove?: () => void;
  onDelete?: () => void;

  /** Whether to show top border (default: true) */
  borderTop?: boolean;
}

export const TransactionRow = forwardRef<HTMLDivElement, TransactionRowProps>(
  (
    {
      leading,
      description,
      amount,
      isCredit,
      balance,
      account,
      plastic,
      reviewStatus,
      note,
      link,
      provenance,
      contextLine,
      categories,
      category,
      onSetCategory,
      onCategoryClick,
      onMoreCategoriesClick,
      status,
      selectable,
      selected,
      onSelectedChange,
      monitored,
      excluded,
      selectionMode,
      onDetail,
      onViewDetail,
      chevron = false,
      swipeable,
      swipeLeft,
      swipeRight,
      onApprove,
      onDelete,
      borderTop = true,
      className,
      children,
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
      ...props
    },
    ref,
  ) => {
    const isPhone = useIsPhone();

    const isSel = selected ?? status === 'selected';
    const isMon = monitored ?? status === 'monitored';
    const isExc = excluded ?? status === 'excluded';
    const isSelectable = selectable ?? Boolean(onSelectedChange);

    const showDesktopCheckbox = !isPhone && isSelectable;
    const showEye =
      selectionMode ||
      ((isSel || isSelectable) && Boolean(onDetail || onViewDetail));

    // Long press detection for mobile selection
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

    const computedIsCredit =
      isCredit ??
      (typeof amount === 'string' && amount.trim().startsWith('+'));

    // Assemble context line items in canonical order:
    // account name first, plastic, amber review words, note, blue link/record words, grey provenance
    const contextElements: React.ReactNode[] = [];

    if (contextLine) {
      contextElements.push(contextLine);
    } else {
      if (account) {
        contextElements.push(
          <span key="account">
            {account}
            {plastic && ` ${plastic}`}
          </span>,
        );
      } else if (plastic) {
        contextElements.push(<span key="plastic">{plastic}</span>);
      }

      if (reviewStatus) {
        contextElements.push(
          <StatusWord key="review" tone="review">
            {reviewStatus}
          </StatusWord>,
        );
      }

      if (note) {
        contextElements.push(
          <span key="note" className="text-ink-2">
            {note}
          </span>,
        );
      }

      if (link) {
        const isRecord =
          typeof link === 'object' && 'isRecord' in link
            ? Boolean(link.isRecord)
            : false;
        const label =
          typeof link === 'object' && 'label' in link ? link.label : link;
        contextElements.push(
          <StatusWord key="link" tone="link" showIcon={!isRecord}>
            {label}
          </StatusWord>,
        );
      }

      if (provenance) {
        contextElements.push(
          <StatusWord key="provenance" tone="provenance">
            {provenance}
          </StatusWord>,
        );
      }
    }

    const renderCategories = () => {
      if (category) return category;
      if (!categories) return null;

      if (categories.length === 0) {
        return (
          <CategoryChip variant="unset" onClick={onSetCategory}>
            Set category
          </CategoryChip>
        );
      }

      return (
        <>
          <CategoryChip
            onClick={
              onCategoryClick ? () => onCategoryClick(categories[0]) : undefined
            }
          >
            {categories[0]}
          </CategoryChip>
          {categories.length > 1 && (
            <CategoryChip
              variant="count"
              count={categories.length - 1}
              onClick={onMoreCategoriesClick}
            />
          )}
        </>
      );
    };

    const handleRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isLongPressTriggeredRef.current) {
        isLongPressTriggeredRef.current = false;
        return;
      }
      if (isSelectable || selectionMode || isSel) {
        onSelectedChange?.(!isSel);
      }
      onClick?.(e);
    };

    const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (isSelectable || selectionMode || isSel) {
          onSelectedChange?.(!isSel);
        } else {
          onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }
      onKeyDown?.(e);
    };

    const isInteractive = Boolean(
      onClick || isSelectable || selectionMode || onSelectedChange,
    );

    const rowContent = (
      <div
        ref={ref}
        role={isInteractive ? 'row' : undefined}
        aria-selected={isSelectable ? isSel : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
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
        className={cn(
          'relative px-space-12 py-space-8 text-body transition-colors select-none font-text',
          borderTop ? 'border-t border-line-soft first:border-t-0' : 'border-t-0',
          isSel && 'bg-brand-tint',
          isMon && 'bg-watch-tint',
          isExc && 'opacity-60',
          !isSel && !isMon && 'bg-surface hover:bg-hover active:bg-hover',
          isInteractive && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          className,
        )}
        {...props}
      >
        {isSel && (
          <span
            className="absolute left-0 top-0 bottom-0 w-space-4 bg-brand pointer-events-none"
            aria-hidden="true"
          />
        )}
        {isMon && (
          <span
            className="absolute left-0 top-0 bottom-0 w-space-4 bg-watch pointer-events-none"
            aria-hidden="true"
          />
        )}

        <div className="flex items-center gap-space-10 min-w-0 w-full">
          {/* Desktop Checkbox */}
          {showDesktopCheckbox && (
            <div className="flex items-center justify-center shrink-0 pr-space-4">
              <Checkbox
                checked={isSel}
                onCheckedChange={(checked) => onSelectedChange?.(Boolean(checked))}
                aria-label={
                  typeof description === 'string'
                    ? `Select ${description}`
                    : 'Select transaction'
                }
              />
            </div>
          )}

          {/* Leading Avatar / Mark */}
          {leading && <div className="shrink-0 flex items-center">{leading}</div>}

          {/* Grid for description, amount, context, categories */}
          <div
            className={cn(
              'grid gap-x-space-10 min-w-0 w-full flex-1',
              showEye || chevron
                ? 'grid-cols-[minmax(0,1fr)_auto_auto]'
                : 'grid-cols-[minmax(0,1fr)_auto]',
            )}
          >
            {/* Line 1: Description */}
            <div className="col-start-1 row-start-1 text-heading text-ink break-words min-w-0">
              {description ?? children}
            </div>

            {/* Line 1: Amount + Running balance */}
            <div
              className={cn(
                'col-start-2 row-start-1 text-right font-bold text-heading tabular-nums whitespace-nowrap',
                computedIsCredit ? 'text-positive' : 'text-ink',
              )}
            >
              {amount}
              {balance && (
                <div className="text-caption font-medium text-ink-3">
                  {balance}
                </div>
              )}
            </div>

            {/* Trailing eye icon in selection mode or chevron */}
            {(showEye || chevron) && (
              <div className="col-start-3 row-start-1 row-span-2 flex items-center justify-end text-ink-3">
                {showEye && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      (onDetail ?? onViewDetail)?.();
                    }}
                    aria-label="View transaction details"
                    className="p-space-4 text-ink-3 hover:text-ink h-auto min-h-0"
                  >
                    <Icon name="view" size="md" />
                  </Button>
                )}
                {chevron && (
                  <Icon name="chevron-right" size="sm" className="text-ink-4 shrink-0" />
                )}
              </div>
            )}

            {/* Line 2: Context line */}
            <div className="col-start-1 row-start-2 mt-space-4 text-caption font-medium text-ink-3 self-center break-words min-w-0">
              {contextElements.map((el, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-ink-4 select-none"> · </span>}
                  {el}
                </React.Fragment>
              ))}
            </div>

            {/* Line 2: Category chips */}
            <div className="col-start-2 row-start-2 mt-space-4 flex items-center justify-end gap-space-4 self-center">
              {renderCategories()}
            </div>
          </div>
        </div>
      </div>
    );

    const isSwipeEnabled = Boolean(
      swipeable || swipeLeft || swipeRight || onApprove || onDelete,
    );

    if (isSwipeEnabled) {
      return (
        <SwipeActions
          left={swipeLeft}
          right={swipeRight}
          onApprove={onApprove}
          onDelete={onDelete}
        >
          {rowContent}
        </SwipeActions>
      );
    }

    return rowContent;
  },
);

TransactionRow.displayName = 'TransactionRow';
