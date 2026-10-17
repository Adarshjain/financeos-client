'use client';

import React, { forwardRef } from 'react';

import {
  Badge,
  Button,
  Checkbox,
  cn,
  Icon,
  StatusWord,
  useControllableState,
  useLongPress,
  useSelectableItem,
} from '@/components/ds';

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
  /** Whether the amount is a credit (+ positive green). Set by caller. */
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

  /** Categories list: empty array renders dashed unset category chip, 1 renders chip, 2+ renders chip and +n count */
  categories?: string[];
  /** Label for unset category (e.g. "Set category") passed from page */
  unsetCategoryLabel?: React.ReactNode;
  /** Callback when unset category chip is clicked */
  onSetCategory?: () => void;
  /** Callback when first category is clicked */
  onCategoryClick?: (category: string) => void;
  /** Callback when +n categories chip is clicked */
  onMoreCategoriesClick?: () => void;

  /** Visual tone: 'default' | 'warning' (e.g. monitored) */
  tone?: 'default' | 'warning';
  /** Whether row is disabled (e.g. excluded) */
  disabled?: boolean;
  /** Whether row is selectable */
  selectable?: boolean;
  /** Default selected state (uncontrolled) */
  defaultSelected?: boolean;
  /** Whether row is selected (controlled) */
  selected?: boolean;
  /** Callback when selection state changes */
  onSelectedChange?: (selected: boolean) => void;

  /** Selection mode: displays trailing eye icon to view details */
  selectionMode?: boolean;
  /** Callback when trailing eye icon is clicked to view detail */
  onDetail?: () => void;

  /** Trailing chevron indicator */
  chevron?: boolean;

  /** Whether to show top border (default: true) */
  borderTop?: boolean;
}

export const TransactionRow = forwardRef<HTMLDivElement, TransactionRowProps>(
  (
    {
      leading,
      description,
      amount,
      isCredit = false,
      balance,
      account,
      plastic,
      reviewStatus,
      note,
      link,
      provenance,
      contextLine,
      categories,
      unsetCategoryLabel,
      onSetCategory,
      onCategoryClick,
      onMoreCategoriesClick,
      tone = 'default',
      disabled = false,
      selectable,
      defaultSelected,
      selected: selectedProp,
      onSelectedChange,
      selectionMode = false,
      onDetail,
      chevron = false,
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
    const [selected, setSelected] = useControllableState({
      value: selectedProp,
      defaultValue: defaultSelected ?? false,
      onChange: onSelectedChange,
    });

    const isWarning = tone === 'warning';
    const isSelectable = selectable ?? Boolean(onSelectedChange);

    const showEye =
      selectionMode ||
      ((selected || isSelectable) && Boolean(onDetail));

    // Long press detection for mobile selection
    const longPress = useLongPress({
      onLongPress: () => setSelected(true),
      disabled: !isSelectable && !selectionMode,
    });

    const item = useSelectableItem({
      selected,
      onSelectedChange: setSelected,
      selectionMode,
      selectable,
      consumeLongPress: longPress.consumeTriggered,
      onClick,
      onKeyDown,
    });

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
          <StatusWord key="review" tone="warning">
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
          <StatusWord
            key="link"
            tone="info"
            icon={!isRecord ? 'link' : undefined}
          >
            {label}
          </StatusWord>,
        );
      }

      if (provenance) {
        contextElements.push(
          <StatusWord key="provenance" tone="neutral">
            {provenance}
          </StatusWord>,
        );
      }
    }

    const renderCategories = () => {
      if (!categories) return null;

      if (categories.length === 0) {
        if (!unsetCategoryLabel) return null;
        return (
          <Badge
            variant="dashed"
            shape="rounded"
            tone="warning"
            onClick={onSetCategory}
          >
            {unsetCategoryLabel}
          </Badge>
        );
      }

      return (
        <>
          <Badge
            variant="outline"
            shape="rounded"
            onClick={
              onCategoryClick ? () => onCategoryClick(categories[0]) : undefined
            }
          >
            {categories[0]}
          </Badge>
          {categories.length > 1 && (
            <Badge
              variant="outline"
              shape="rounded"
              onClick={onMoreCategoriesClick}
            >
              +{categories.length - 1}
            </Badge>
          )}
        </>
      );
    };

    const isInteractive = Boolean(
      onClick || isSelectable || selectionMode || onSelectedChange,
    );

    return (
      <div
        ref={ref}
        role={isInteractive ? 'row' : undefined}
        aria-selected={isSelectable ? selected : undefined}
        tabIndex={isInteractive && !disabled ? 0 : undefined}
        onClick={disabled ? undefined : item.handleClick}
        onKeyDown={disabled ? undefined : item.handleKeyDown}
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
        className={cn(
          'relative px-space-12 py-space-8 text-body transition-colors select-none font-text',
          borderTop ? 'border-t border-line-soft first:border-t-0' : 'border-t-0',
          selected && 'bg-brand-tint',
          isWarning && 'bg-attention-tint',
          disabled && 'opacity-60 pointer-events-none',
          !selected && !isWarning && 'bg-surface hover:bg-hover active:bg-hover',
          isInteractive && !disabled && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          className,
        )}
        {...props}
      >
        {selected && (
          <span
            className="absolute left-0 top-0 bottom-0 w-space-4 bg-brand pointer-events-none"
            aria-hidden="true"
          />
        )}
        {isWarning && (
          <span
            className="absolute left-0 top-0 bottom-0 w-space-4 bg-attention pointer-events-none"
            aria-hidden="true"
          />
        )}

        <div className="flex items-center gap-space-10 min-w-0 w-full">
          {/* Desktop Checkbox */}
          {isSelectable && (
            <div className="hidden lg:flex items-center justify-center shrink-0 pr-space-4">
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => setSelected(checked === true)}
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
                isCredit ? 'text-positive' : 'text-ink',
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
                      onDetail?.();
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
  },
);

TransactionRow.displayName = 'TransactionRow';
