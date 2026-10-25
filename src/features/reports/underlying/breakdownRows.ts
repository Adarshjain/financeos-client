// What pressing a row of a breakdown section does, shared by the Legacy and Dinero breakdown views.

import type { BreakdownFrame, BreakdownSectionData } from '@/features/reports/underlying/underlying.types';
import type { TableRow } from '@/lib/reports.types';

export interface BreakdownRowHandlers {
  onOpenTransaction: (id: string) => void;
  onOpenBreakdown: (frame: BreakdownFrame) => void;
}

/** The section's row press: open a transaction, open a nested breakdown, or undefined when rows do nothing. */
export function rowClickHandler(
  section: BreakdownSectionData,
  { onOpenTransaction, onOpenBreakdown }: BreakdownRowHandlers,
): ((row: TableRow) => void) | undefined {
  if (section.rowAction === 'transaction') {
    return (row) => {
      if (row.id != null) onOpenTransaction(String(row.id));
    };
  }
  if (section.rowAction === 'breakdown' && section.rowBreakdownDatasource) {
    const nested = section.rowBreakdownDatasource;
    return (row) => {
      if (row.id != null) onOpenBreakdown({ datasource: nested, rowId: String(row.id) });
    };
  }
  return undefined;
}
