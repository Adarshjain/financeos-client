import { Account } from '@/lib/account.types';
import { FilterClause } from '@/lib/reports.types';
import { PagedTransaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

export function getSelectableAccounts(accounts: Account[]): Account[] {
  return accounts.filter((a) => a.type !== AccountType.BROKER);
}

interface BuildReviewFiltersParams {
  activeReasonFilter: string;
  appliedAccountIds: string[];
  selectableAccountsCount: number;
  appliedOnlyUpToLastStatement: boolean;
  /** A statement period from a deep link; both bounds inclusive, ISO dates. */
  dateRange?: { from: string; to: string } | null;
}

/** The always-NEEDS_REVIEW filter set, plus the reason/account/statement
 * clauses the toolbar currently has active. */
export function buildReviewFilters({
  activeReasonFilter,
  appliedAccountIds,
  selectableAccountsCount,
  appliedOnlyUpToLastStatement,
  dateRange = null,
}: BuildReviewFiltersParams): FilterClause[] {
  const list: FilterClause[] = [
    { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
  ];

  if (activeReasonFilter !== 'ALL') {
    list.push({
      field: 'reviewReason',
      operator: 'is',
      value: activeReasonFilter,
    });
  }

  if (appliedAccountIds.length < selectableAccountsCount) {
    list.push({
      field: 'accountId',
      operator: 'in',
      value: appliedAccountIds,
    });
  }

  if (appliedOnlyUpToLastStatement) {
    list.push({
      field: 'coveredByStatement',
      operator: 'is',
      value: true,
    });
  }

  if (dateRange) {
    list.push({
      field: 'date',
      operator: 'between',
      value: { from: dateRange.from, to: dateRange.to },
    });
  }

  return list;
}

/** How many rows the "up to last statement" filter is currently hiding,
 * derived by diffing against the unfiltered total. */
export function computeHiddenCount(
  appliedOnlyUpToLastStatement: boolean,
  pagedData: { totalElements: number } | null,
  unfilteredPagedData: { totalElements: number } | null | undefined
): number {
  if (!appliedOnlyUpToLastStatement || !pagedData || !unfilteredPagedData) return 0;
  return Math.max(0, unfilteredPagedData.totalElements - pagedData.totalElements);
}

export function getSelectedTxns(
  pagedData: PagedTransaction | null,
  selectedIds: string[]
) {
  if (!pagedData || selectedIds.length !== 2) return [];
  return pagedData.content.filter((t) => selectedIds.includes(t.id));
}

/** How many of the selected (loaded-page) transactions carry a loan, lending or dividend
 * obligation ref — used to warn before a bulk delete that those records will
 * lose their link. Unlike `getSelectedTxns` this isn't capped to a pair, since
 * bulk delete allows any selection size. */
export function getObligationLinkedCount(
  pagedData: PagedTransaction | null,
  selectedIds: string[]
): number {
  if (!pagedData || selectedIds.length === 0) return 0;
  const selectedIdSet = new Set(selectedIds);
  return pagedData.content.filter(
    (t) => selectedIdSet.has(t.id) && (t.obligationRefs?.length ?? 0) > 0
  ).length;
}

/** Next selected-ids set after toggling "select all" for the currently
 * loaded page (adds/removes just that page's ids, preserving selections
 * made on other pages). */
export function togglePageSelection(
  checked: boolean | 'indeterminate',
  pagedData: PagedTransaction | null,
  selectedIds: string[]
): string[] {
  if (!pagedData) return selectedIds;
  const pageIds = pagedData.content.map((t) => t.id);
  if (checked === true) {
    return Array.from(new Set([...selectedIds, ...pageIds]));
  }
  return selectedIds.filter((id) => !pageIds.includes(id));
}
