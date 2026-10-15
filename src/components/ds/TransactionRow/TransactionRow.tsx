import { Eye, Link2 } from 'lucide-react';
import React, { forwardRef, useRef } from 'react';

import { CategoryChip } from '../CategoryChip/CategoryChip';
import { cn } from '../cn';
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

  /** Whether to show top border (default: true) */
  borderTop?: boolean;
}

export const TransactionRow = forwardRef<HTMLDivElement, TransactionRowProps>(
  (
    {
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
      selected = false,
      onSelectedChange,
      monitored = false,
      excluded = false,
      selectionMode = false,
      onDetail,
      onViewDetail,
      borderTop = true,
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

    const resolvedStatus: TransactionRowStatus =
      status ??
      (selected
        ? 'selected'
        : monitored
          ? 'monitored'
          : excluded
            ? 'excluded'
            : 'default');

    const isSel = resolvedStatus === 'selected';
    const isMon = resolvedStatus === 'monitored';
    const isExc = resolvedStatus === 'excluded';

    const isSelectable = selectable ?? Boolean(onSelectedChange);
    const showDesktopCheckbox =
      !isPhone && (isSelectable || selectionMode || isSel);
    const showEye =
      selectionMode ||
      ((isSel || isSelectable) && Boolean(onDetail || onViewDetail));

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
          <span key="review" className="text-warning font-bold">
            {reviewStatus}
          </span>,
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
          <span
            key="link"
            className="text-info font-semibold inline-flex items-center gap-space-2 whitespace-nowrap"
          >
            {!isRecord && (
              <Link2
                className="w-space-10 h-space-10 shrink-0"
                aria-hidden="true"
              />
            )}
            {label}
          </span>,
        );
      }

      if (provenance) {
        contextElements.push(
          <span key="provenance" className="text-ink-3 font-medium">
            {provenance}
          </span>,
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

    return (
      <div
        ref={ref}
        role={isInteractive ? 'row' : undefined}
        aria-selected={isSelectable || selectionMode ? isSel : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        className={cn(
          'relative px-space-14 py-space-10 transition-colors select-none min-w-0 w-full',
          borderTop ? 'border-t border-line-soft' : 'border-t-0',
          isSel ? 'bg-brand-tint' : isMon ? 'bg-watch-tint' : 'bg-surface',
          isExc && 'opacity-60',
          isInteractive && !isSel && !isMon && 'hover:bg-hover cursor-pointer',
          isInteractive &&
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
          className,
        )}
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

        <div
          className={cn(
            'grid gap-x-space-10 min-w-0 w-full',
            showDesktopCheckbox
              ? showEye
                ? 'grid-cols-[auto_minmax(0,1fr)_auto_32px]'
                : 'grid-cols-[auto_minmax(0,1fr)_auto]'
              : showEye
                ? 'grid-cols-[minmax(0,1fr)_auto_32px]'
                : 'grid-cols-[minmax(0,1fr)_auto]',
          )}
        >
          {/* Desktop Checkbox */}
          {showDesktopCheckbox && (
            <div className="col-start-1 row-start-1 row-span-2 flex items-center justify-center pr-space-10 shrink-0">
              <input
                type="checkbox"
                checked={isSel}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelectedChange?.(e.target.checked);
                }}
                aria-label={
                  typeof description === 'string'
                    ? `Select ${description}`
                    : 'Select transaction'
                }
                className="accent-brand cursor-pointer w-space-16 h-space-16 rounded-ds-xs m-0"
              />
            </div>
          )}

          {/* Line 1: Description */}
          <div
            className={cn(
              showDesktopCheckbox ? 'col-start-2' : 'col-start-1',
              'row-start-1 text-heading text-ink break-words min-w-0',
            )}
          >
            {description ?? children}
          </div>

          {/* Line 1: Amount + Running balance */}
          <div
            className={cn(
              showDesktopCheckbox ? 'col-start-3' : 'col-start-2',
              'row-start-1 text-right font-bold text-heading tabular-nums whitespace-nowrap',
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

          {/* Trailing eye icon in selection mode */}
          {showEye && (
            <div
              className={cn(
                showDesktopCheckbox ? 'col-start-4' : 'col-start-3',
                'row-start-1 row-span-2 flex items-center justify-end text-ink-3',
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  (onDetail ?? onViewDetail)?.();
                }}
                aria-label="View transaction details"
                className="p-space-4 rounded-ds-sm hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Eye className="w-space-16 h-space-16" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Line 2: Context line */}
          <div
            className={cn(
              showDesktopCheckbox ? 'col-start-2' : 'col-start-1',
              'row-start-2 mt-space-4 text-caption font-medium text-ink-3 self-center break-words min-w-0',
            )}
          >
            {contextElements.map((el, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-ink-4 select-none"> · </span>}
                {el}
              </React.Fragment>
            ))}
          </div>

          {/* Line 2: Category chips */}
          <div
            className={cn(
              showDesktopCheckbox ? 'col-start-3' : 'col-start-2',
              'row-start-2 mt-space-4 flex items-center justify-end gap-space-4 self-center',
            )}
          >
            {renderCategories()}
          </div>
        </div>
      </div>
    );
  },
);

TransactionRow.displayName = 'TransactionRow';
