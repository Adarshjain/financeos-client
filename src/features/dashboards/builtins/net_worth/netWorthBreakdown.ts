// The net worth card's "Cash · Invested · Cards · Loans" line: the net_worth datasource summed by kind, then
// grouped as the card reads them. Lending is part of the total but not of this line.

import type { ChartData, RunReportRequest } from '@/lib/reports.types';

export interface NetWorthPart {
  key: 'cash' | 'invested' | 'cards' | 'loans';
  label: string;
  /** Signed: liabilities are negative. */
  value: number;
}

/** Which datasource kinds make up each part, in the order the line reads. */
const GROUPS: ReadonlyArray<{ key: NetWorthPart['key']; label: string; kinds: readonly string[] }> = [
  { key: 'cash', label: 'Cash', kinds: ['bank_account', 'generic'] },
  { key: 'invested', label: 'Invested', kinds: ['broker'] },
  { key: 'cards', label: 'Cards', kinds: ['credit_card'] },
  { key: 'loans', label: 'Loans', kinds: ['loan'] },
];

/** The ad-hoc report beside the KPI: signed net worth summed per kind. */
export function netWorthByKindRequest(): RunReportRequest {
  return {
    type: 'CHART',
    datasource: 'net_worth',
    definition: {
      chartType: 'bar',
      dimension: { field: 'kind' },
      measure: { field: 'signedValue', aggregation: 'sum' },
      filters: [],
    },
  };
}

/**
 * The four parts from the by-kind chart data. A category is the stored kind, or its label when the server sends
 * labels; a part with no accounts is left out, and null when nothing is there to show.
 */
export function netWorthParts(data: ChartData | null | undefined): NetWorthPart[] | null {
  if (!data) return null;
  const values = data.series[0]?.data ?? [];
  const labelToKind = new Map(Object.entries(data.valueLabels ?? {}).map(([kind, label]) => [label, kind]));
  const byKind = new Map<string, number>();
  data.categories.forEach((category, i) => {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) return;
    const kind = labelToKind.get(category) ?? category;
    byKind.set(kind, (byKind.get(kind) ?? 0) + v);
  });
  const parts = GROUPS.flatMap((g): NetWorthPart[] => {
    const present = g.kinds.filter((k) => byKind.has(k));
    if (present.length === 0) return [];
    return [{ key: g.key, label: g.label, value: present.reduce((s, k) => s + (byKind.get(k) ?? 0), 0) }];
  });
  return parts.length > 0 ? parts : null;
}
