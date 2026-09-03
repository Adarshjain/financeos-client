import { batchFailureLabel } from '@/components/transactions/catalog';
import { Account } from '@/lib/account.types';
import { FilterClause } from '@/lib/reports.types';
import { PagedTransaction, ReviewReason } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

export function getSelectableAccounts(accounts: Account[]): Account[] {
  return accounts.filter((a) => a.type !== AccountType.BROKER);
}

interface BuildReviewFiltersParams {
  activeReasonFilter: string;
  appliedAccountIds: string[];
  selectableAccountsCount: number;
  appliedOnlyUpToLastStatement: boolean;
}

/** The always-NEEDS_REVIEW filter set, plus the reason/account/statement
 * clauses the toolbar currently has active. */
export function buildReviewFilters({
  activeReasonFilter,
  appliedAccountIds,
  selectableAccountsCount,
  appliedOnlyUpToLastStatement,
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

export function getPresentReasons(
  pagedData: PagedTransaction | null,
  selectedIds: string[]
): ReviewReason[] {
  const txns = pagedData?.content.filter((t) => selectedIds.includes(t.id)) || [];
  return Array.from(new Set(txns.flatMap((t) => t.reviewReasons || [])));
}

/** Shapes a batch-approve/-delete response's failed ids into the descriptions
 * the result-summary dialog displays, resolving each id against the still-
 * loaded page of transactions it came from. */
export function mapBatchFailures(
  failures: { id: string; reason?: string }[] | undefined,
  pagedData: PagedTransaction | null
): { description: string; reason: string }[] {
  return (failures || []).map((f) => {
    const txn = pagedData?.content.find((t) => t.id === f.id);
    const desc = txn
      ? txn.description || txn.sourcedDescription
      : `Transaction ID: ${f.id}`;
    return { description: desc || '', reason: batchFailureLabel(f.reason || '') };
  });
}

export function mapBatchSkips(
  skippedIds: string[] | undefined,
  pagedData: PagedTransaction | null
): string[] {
  return (skippedIds || []).map((id) => {
    const txn = pagedData?.content.find((t) => t.id === id);
    return txn
      ? txn.description || txn.sourcedDescription || ''
      : `Transaction ID: ${id}`;
  });
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
