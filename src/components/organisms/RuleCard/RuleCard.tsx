'use client';

import React, { forwardRef } from 'react';
import { mergeProps } from 'react-aria';

import {
  Badge,
  Button,
  Card,
  Checkbox,
  cn,
  Icon,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  StatusWords,
  useControllableState,
  useSelectableItem,
} from '@/components/ds';

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
  /** Default selected state (uncontrolled) */
  defaultSelected?: boolean;
  /** Whether the card is selected (controlled) */
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
      defaultSelected,
      selected: selectedProp,
      onSelectedChange,
      selectionMode = false,
      onDetail,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isVerified = status === 'verified';

    const [selected, setSelected] = useControllableState({
      value: selectedProp,
      defaultValue: defaultSelected ?? false,
      onChange: onSelectedChange,
    });

    const isSelectable = Boolean(selectable);
    const showEye = selectionMode && Boolean(onDetail);

    const { itemProps, nestedControlProps } = useSelectableItem({
      selectable,
      selected,
      onSelectedChange: setSelected,
      selectionMode,
      onPress: onDetail,
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
      const hasApprove = !isVerified && effectiveApprove?.onSelect;
      const hasMenu = menuItems && menuItems.length > 0;

      // Selection mode is a phone pattern: the eye replaces the actions below `desk` only; on desktop they stay.
      const eye = showEye ? (
        <span {...nestedControlProps} className="desk:hidden">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            iconOnly
            onClick={onDetail}
            aria-label="View rule details"
            className="text-brand-strong shrink-0"
          >
            <Icon name="view" size="md" />
          </Button>
        </span>
      ) : null;

      if (!hasApprove && !hasMenu) return eye;

      return (
        <>
          {eye}
          <div
            {...nestedControlProps}
            className={cn('flex items-center gap-space-6 shrink-0', showEye && 'max-desk:hidden')}
          >
            {hasApprove && (
              <Button
                size="sm"
                variant="secondary"
                onClick={effectiveApprove.onSelect}
                icon={<Icon name="check" size="xs" />}
              >
                {effectiveApprove.label ?? 'Approve'}
              </Button>
            )}

            {hasMenu && (
              <Menu.Root>
                <MenuTrigger asChild>
                  <Button size="sm" variant="ghost" iconOnly aria-label="Rule actions">
                    <Icon name="more" size="sm" />
                  </Button>
                </MenuTrigger>
                <MenuContent align="end">
                  {menuItems.map((menuItem, idx) => (
                    <MenuItem key={idx} destructive={menuItem.destructive} onSelect={menuItem.onSelect}>
                      {menuItem.label}
                    </MenuItem>
                  ))}
                </MenuContent>
              </Menu.Root>
            )}
          </div>
        </>
      );
    };

    const isInteractive = Boolean(
      props.onClick || isSelectable || selectionMode || onSelectedChange,
    );

    return (
      <Card
        ref={ref}
        role={isSelectable ? 'checkbox' : isInteractive ? 'button' : undefined}
        aria-selected={isSelectable || selectionMode ? selected : undefined}
        aria-checked={isSelectable ? selected : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        className={cn(
          'px-space-14 py-space-12 flex flex-col gap-space-6 select-none touch-callout-none transition-colors duration-fast min-w-0',
          selected
            ? 'bg-brand-tint border-brand ring-1 ring-inset ring-brand'
            : 'bg-surface border-line',
          isInteractive && !selected && 'hover:border-line-strong cursor-pointer',
          isInteractive &&
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
          className,
        )}
        {...mergeProps(props, itemProps)}
      >
        {/* Header: Desktop Checkbox + Name + Pattern, and used count */}
        <div className="flex gap-space-10 items-start justify-between">
          <div className="flex items-start gap-space-10 flex-1 min-w-0">
            {(isSelectable || selectionMode || selected) && (
              <div
                {...nestedControlProps}
                className="shrink-0 mt-space-2 hidden desk:inline-flex"
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => {
                    setSelected(checked === true);
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
                >
                  {cat}
                </Badge>
              ))}
          </div>
          {renderActions()}
        </div>
      </Card>
    );
  },
);

RuleCard.displayName = 'RuleCard';
