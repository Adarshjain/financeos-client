'use client';

import React, { forwardRef } from 'react';
import { mergeProps } from 'react-aria';

import {
  Badge,
  Button,
  Checkbox,
  cn,
  Highlight,
  Icon,
  Reveal,
  StatusWord,
  useControllableState,
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
  /** Date shown on desktop table row */
  date?: React.ReactNode;
  /** Merchant or main transaction description */
  description?: React.ReactNode;
  /** Formatted transaction amount, e.g. "3,600.00" or "+2,15,000.00" */
  amount?: React.ReactNode;
  /** Whether the amount is a credit (+ positive green). Set by caller. */
  isCredit?: boolean;
  /** Optional running balance shown below amount, e.g. "₹61,757" */
  balance?: React.ReactNode;

  /** Account name, e.g. "HDFC Bank Savings" or "HDFC Regalia" */
  account?: React.ReactNode;
  /** Small logo shown right before the account name (phone context line and desktop Account cell). Leave unset for no logo and no gap. */
  accountLogo?: React.ReactNode;
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
  /** Whether row is disabled: dimmed and not interactive */
  disabled?: boolean;
  /** Dimmed like disabled but still interactive (e.g. excluded: it still opens and selects) */
  muted?: boolean;
  /** The row open in the detail pane: the `brand-tint` ground, like DataTable's highlighted row */
  highlighted?: boolean;
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

  /** Search text: matches in string description, account, categories, amount, note, plastic and contextLine get the marker stroke */
  query?: string;
}

export const TransactionRow = forwardRef<HTMLDivElement, TransactionRowProps>(
  (
    {
      leading,
      date,
      description,
      amount,
      isCredit = false,
      balance,
      account,
      accountLogo,
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
      muted = false,
      highlighted = false,
      selectable,
      defaultSelected,
      selected: selectedProp,
      onSelectedChange,
      selectionMode = false,
      onDetail,
      chevron = false,
      borderTop = true,
      query,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const [selected, setSelected] = useControllableState({
      value: selectedProp,
      defaultValue: defaultSelected ?? false,
      onChange: onSelectedChange,
    });

    const mark = (value: React.ReactNode): React.ReactNode =>
      query && typeof value === 'string' ? (
        <Highlight text={value} query={query} />
      ) : (
        value
      );

    // The paise use one size at every width (label, owner 2026-10-23); credits keep their green, others
    // mute to ink-3.
    const markAmount = (value: React.ReactNode): React.ReactNode => {
      if (query && typeof value === 'string') return mark(value);
      if (typeof value !== 'string' && typeof value !== 'number') return value;
      const text = String(value);
      const at = text.lastIndexOf('.');
      if (at < 0) return value;
      return (
        <>
          {text.slice(0, at)}
          <span className={cn('text-label', !isCredit && 'text-ink-3')}>{text.slice(at)}</span>
        </>
      );
    };

    const isWarning = tone === 'warning';
    const isSelectable = Boolean(selectable);

    const showEye = selectionMode && Boolean(onDetail);
    // A selectable row keeps its eye mounted so it slides in and out with selection mode instead of popping.
    const hasEye = Boolean(onDetail) && (isSelectable || selectionMode);
    const eyeOnly = hasEye && !chevron;

    const { itemProps, nestedControlProps } = useSelectableItem({
      selectable,
      selected,
      onSelectedChange: setSelected,
      selectionMode,
      onPress: onDetail,
      disabled,
    });

    // Assemble context line items in canonical order:
    // account name first, plastic, amber review words, note, blue link/record words, grey provenance
    const contextElements: React.ReactNode[] = [];
    const desktopContextElements: React.ReactNode[] = [];

    if (contextLine) {
      contextElements.push(mark(contextLine));
      desktopContextElements.push(mark(contextLine));
    } else {
      if (account) {
        contextElements.push(
          <span key="account" className={accountLogo ? 'inline-flex items-center gap-space-4' : undefined}>
            {accountLogo}
            <span>
            {mark(account)}
            {plastic && <> {mark(plastic)}</>}
            </span>
          </span>,
        );
      } else if (plastic) {
        contextElements.push(<span key="plastic">{mark(plastic)}</span>);
      }

      if (reviewStatus) {
        const el = (
          <StatusWord key="review" tone="warning">
            {reviewStatus}
          </StatusWord>
        );
        contextElements.push(el);
        desktopContextElements.push(el);
      }

      if (note) {
        const el = (
          <span key="note" className="text-ink-2">
            {mark(note)}
          </span>
        );
        contextElements.push(el);
        desktopContextElements.push(el);
      }

      if (link) {
        const isRecord =
          typeof link === 'object' && 'isRecord' in link
            ? Boolean(link.isRecord)
            : false;
        const label =
          typeof link === 'object' && 'label' in link ? link.label : link;
        const el = (
          <StatusWord
            key="link"
            tone="info"
            icon={!isRecord ? 'link' : undefined}
          >
            {label}
          </StatusWord>
        );
        contextElements.push(el);
        desktopContextElements.push(el);
      }

      if (provenance) {
        const el = (
          <StatusWord key="provenance" tone="neutral">
            {provenance}
          </StatusWord>
        );
        contextElements.push(el);
        desktopContextElements.push(el);
      }
    }

    const renderCategories = () => {
      if (!categories) return null;

      if (categories.length === 0) {
        if (!unsetCategoryLabel) return null;
        const badge = (
          <Badge
            variant="dashed"
            shape="rounded"
            tone="warning"
            onClick={onSetCategory}
          >
            {unsetCategoryLabel}
          </Badge>
        );
        return onSetCategory ? (
          <span {...nestedControlProps}>{badge}</span>
        ) : (
          badge
        );
      }

      return (
        <>
          {onCategoryClick ? (
            <span {...nestedControlProps}>
              <Badge
                variant="outline"
                shape="rounded"
                onClick={() => onCategoryClick(categories[0])}
              >
                {mark(categories[0])}
              </Badge>
            </span>
          ) : (
            <Badge
              variant="outline"
              shape="rounded"
            >
              {mark(categories[0])}
            </Badge>
          )}
          {categories.length > 1 && (
            onMoreCategoriesClick ? (
              <span {...nestedControlProps}>
                <Badge
                  variant="outline"
                  shape="rounded"
                  onClick={onMoreCategoriesClick}
                >
                  +{categories.length - 1}
                </Badge>
              </span>
            ) : (
              <Badge
                variant="outline"
                shape="rounded"
              >
                +{categories.length - 1}
              </Badge>
            )
          )}
        </>
      );
    };

    // Phone: categories ride the grey context line as text (first category, then "+n")
    const phoneCategory = (): React.ReactNode => {
      if (!categories) return null;
      const control = (label: React.ReactNode, onClick?: () => void) =>
        onClick ? (
          <span {...nestedControlProps}>
            <Button variant="link" onClick={onClick}>
              {label}
            </Button>
          </span>
        ) : (
          label
        );
      if (categories.length === 0) {
        if (!unsetCategoryLabel) return null;
        return (
          <StatusWord key="category" tone="warning">
            {control(unsetCategoryLabel, onSetCategory)}
          </StatusWord>
        );
      }
      return (
        <span key="category" className="inline-flex items-center gap-x-space-4">
          {control(mark(categories[0]), onCategoryClick && (() => onCategoryClick(categories[0])))}
          {categories.length > 1 &&
            control(`+${categories.length - 1}`, onMoreCategoriesClick)}
        </span>
      );
    };
    const phoneCategoryEl = phoneCategory();
    const phoneContextElements = phoneCategoryEl
      ? [...contextElements, phoneCategoryEl]
      : contextElements;

    const isInteractive = Boolean(
      props.onClick || isSelectable || selectionMode || onSelectedChange,
    );

    return (
      <div
        ref={ref}
        role={isInteractive ? 'row' : undefined}
        aria-selected={isSelectable ? selected : undefined}
        tabIndex={isInteractive && !disabled ? 0 : undefined}
        className={cn(
          'relative px-space-12 py-space-8 text-body transition-colors select-none touch-callout-none font-text',
          'desk:grid desk:grid-cols-template desk:items-center desk:p-0 desk:border-l-4 desk:border-l-transparent',
          borderTop ? 'border-t border-line-soft first:border-t-0' : 'border-t-0',
          selected && 'bg-brand-tint desk:border-l-brand',
          isWarning && 'bg-attention-tint desk:border-l-attention',
          disabled && 'opacity-60 pointer-events-none',
          muted && !disabled && 'opacity-60',
          highlighted && !selected && !isWarning && 'bg-brand-tint',
          !selected && !isWarning && !highlighted && 'bg-surface hover:bg-hover active-self:bg-hover',
          isInteractive && !disabled && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
          className,
        )}
        {...mergeProps(props, itemProps)}
      >
        {selected && (
          <span
            className="absolute left-0 top-0 bottom-0 w-space-4 bg-brand pointer-events-none desk:hidden"
            aria-hidden="true"
          />
        )}
        {isWarning && (
          <span
            className="absolute left-0 top-0 bottom-0 w-space-4 bg-attention pointer-events-none desk:hidden"
            aria-hidden="true"
          />
        )}

        <div className="flex items-center gap-space-10 min-w-0 w-full desk:contents">
          {/* Desktop Checkbox (Cell 1 when selectable) */}
          {isSelectable && (
            <div
              role="cell"
              {...nestedControlProps}
              className="hidden desk:flex items-center justify-center min-w-0"
            >
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

          {/* Leading Avatar / Mark (phone only) */}
          {leading && (
            <div className="shrink-0 flex items-center desk:hidden">
              {leading}
            </div>
          )}

          {/* Desktop Date (Cell 2) */}
          <div
            role="cell"
            className="hidden desk:block desk:px-space-12 desk:py-space-6 min-w-0 truncate text-ink-2"
          >
            {date}
          </div>

          {/* Inner wrapper 2 */}
          <div
            className={cn(
              'grid min-w-0 w-full flex-1 desk:contents',
              // Eye only: the spacing lives in the amount cell and the Reveal content, so the closed
              // eye (0 wide) leaves no gap. With a chevron the grid gap stays.
              eyeOnly ? 'gap-x-0' : 'gap-x-space-10',
              hasEye || chevron
                ? 'grid-cols-fill-auto-auto'
                : 'grid-cols-fill-auto',
            )}
          >
            {/* Description and context line (Cell 3 on desktop, col 1 row 1 on phone) */}
            <div
              role="cell"
              className="col-start-1 row-start-1 text-heading text-ink break-words min-w-0 desk:col-start-auto desk:row-start-auto desk:text-body desk:px-space-12 desk:py-space-6"
            >
              <div className="text-heading font-semibold desk:text-body-strong desk:font-semibold text-ink break-words">
                {mark(description) ?? children}
              </div>
              {/* Phone context line (starts with the account) */}
              {phoneContextElements.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-space-4 mt-space-2 text-caption font-medium text-ink-3 min-w-0 desk:hidden">
                  {phoneContextElements.map((el, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-ink-4 select-none">·</span>}
                      {el}
                    </React.Fragment>
                  ))}
                </div>
              )}
              {/* Desktop context line under description */}
              {desktopContextElements.length > 0 && (
                <div className="hidden desk:flex flex-wrap items-center gap-x-space-4 text-caption text-ink-3 break-words mt-space-2">
                  {desktopContextElements.map((el, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-ink-4 select-none">·</span>}
                      {el}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Categories (Cell 4 on desktop only; on phone they sit in the context line) */}
            <div
              role="cell"
              className="hidden desk:flex items-center justify-start gap-space-4 desk:px-space-12 desk:py-space-6 min-w-0 truncate"
            >
              {renderCategories()}
            </div>

            {/* Desktop Account (Cell 5) */}
            <div
              role="cell"
              className="hidden desk:block desk:px-space-12 desk:py-space-6 min-w-0 truncate text-ink-2"
            >
              {accountLogo && <span className="inline-flex align-middle mr-space-4">{accountLogo}</span>}
              {mark(account)}
              {plastic && <> {mark(plastic)}</>}
            </div>

            {/* Amount (Cell 6 on desktop; on phone col 2 across both rows, top-aligned, so it never pushes the left column apart) */}
            <div
              role="cell"
              className={cn(
                eyeOnly && 'pl-space-10',
                'col-start-2 row-start-1 row-span-2 self-start text-right font-bold text-title tabular-nums whitespace-nowrap',
                'desk:col-start-auto desk:row-start-auto desk:row-span-1 desk:self-auto desk:text-heading desk:font-bold desk:px-space-12 desk:py-space-6 desk:text-end desk:justify-self-end',
                isCredit ? 'text-positive' : 'text-ink',
              )}
            >
              {markAmount(amount)}
              {balance && (
                <div className="text-caption font-medium text-ink-3 desk:hidden">
                  {balance}
                </div>
              )}
            </div>

            {/* Desktop Balance (Cell 7) */}
            <div
              role="cell"
              className="hidden desk:block desk:px-space-12 desk:py-space-6 min-w-0 truncate text-end tabular-nums text-ink-2 justify-self-end"
            >
              {balance}
            </div>

            {/* Phone Trailing eye icon in selection mode or chevron */}
            {(hasEye || chevron) && (
              <div className="col-start-3 row-start-1 row-span-2 flex items-center justify-end text-ink-3 desk:hidden">
                {hasEye && (
                  <Reveal open={showEye} axis="x">
                    <span {...nestedControlProps} className={cn('block min-w-0', eyeOnly && 'pl-space-10')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDetail}
                      aria-label="View transaction details"
                      className="p-space-4 text-ink-3 hover:text-ink h-auto min-h-0"
                    >
                      <Icon name="view" size="md" />
                    </Button>
                    </span>
                  </Reveal>
                )}
                {chevron && (
                  <Icon
                    name="chevron-right"
                    size="sm"
                    className="text-ink-4 shrink-0"
                  />
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    );
  },
);

TransactionRow.displayName = 'TransactionRow';
