import { Eye, Link2 } from 'lucide-react';
import React, { forwardRef } from 'react';

import { CategoryChip } from '../CategoryChip/CategoryChip';
import { cn } from '../cn';

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
  /** Shortcut for status="selected" */
  selected?: boolean;
  /** Shortcut for status="monitored" */
  monitored?: boolean;
  /** Shortcut for status="excluded" */
  excluded?: boolean;

  /** Selection mode: displays trailing eye icon to view details */
  selectionMode?: boolean;
  /** Callback when trailing eye icon is clicked */
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
      selected = false,
      monitored = false,
      excluded = false,
      selectionMode = false,
      onViewDetail,
      borderTop = true,
      className,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
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

    return (
      <div
        ref={ref}
        className={cn(
          'relative px-space-14 py-space-8 transition-colors select-none',
          borderTop ? 'border-t border-line-soft' : 'border-t-0',
          isSel ? 'bg-brand-tint' : isMon ? 'bg-watch-tint' : 'bg-surface',
          isExc && 'opacity-60',
          onClick && !isSel && !isMon && 'hover:bg-hover cursor-pointer',
          className,
        )}
        onClick={onClick}
        {...props}
      >
        {isSel && (
          <span
            className="absolute left-0 top-0 bottom-0 w-space-4 bg-brand"
            aria-hidden="true"
          />
        )}
        {isMon && (
          <span
            className="absolute left-0 top-0 bottom-0 w-space-4 bg-watch"
            aria-hidden="true"
          />
        )}

        <div
          className={cn(
            'grid gap-x-space-10',
            selectionMode
              ? 'grid-cols-[minmax(0,1fr)_auto_30px]'
              : 'grid-cols-[minmax(0,1fr)_auto]',
          )}
        >
          {/* Line 1: Description */}
          <div className="text-heading text-ink font-bold break-words min-w-0">
            {description ?? children}
          </div>

          {/* Line 1: Amount + Running balance */}
          <div
            className={cn(
              'text-right font-bold text-heading tabular-nums whitespace-nowrap',
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
          {selectionMode && (
            <div className="row-span-2 flex items-center justify-end text-ink-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail?.();
                }}
                aria-label="View transaction details"
                className="p-space-4 rounded-ds-sm hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Eye className="w-space-16 h-space-16" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Line 2: Context line */}
          <div className="mt-space-4 text-caption font-medium text-ink-3 self-center break-words min-w-0">
            {contextElements.map((el, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-ink-4 select-none"> · </span>}
                {el}
              </React.Fragment>
            ))}
          </div>

          {/* Line 2: Category chips */}
          <div className="mt-space-4 flex items-center justify-end gap-space-4 self-center">
            {renderCategories()}
          </div>
        </div>
      </div>
    );
  },
);

TransactionRow.displayName = 'TransactionRow';
