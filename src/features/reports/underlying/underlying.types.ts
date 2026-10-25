// Types for "View underlying data" (VUD): which KPI the dialog explains, and the
// wire shapes of the underlying-rows and row-breakdown endpoints.

import type { components } from '@/lib/api/schema';
import type { RunReportRequest } from '@/lib/reports.types';

/**
 * The KPI whose rows are listed. A saved report runs by id, the builder's
 * unsaved draft by its full request, a built-in template by key + params.
 */
export type UnderlyingSource =
  | { kind: 'saved'; reportId: string }
  | { kind: 'adhoc'; request: RunReportRequest }
  | { kind: 'builtin'; key: string; params: Record<string, unknown> };

export type UnderlyingPeriod = 'current' | 'previous';

export type KpiUnderlyingResponse = components['schemas']['KpiUnderlyingResponse'];
export type UnderlyingFilterChip = components['schemas']['UnderlyingFilterChip'];
export type UnderlyingExcludedItem = components['schemas']['UnderlyingExcludedItem'];

export type RowBreakdownResponse = components['schemas']['RowBreakdownResponse'];
export type BreakdownStep = components['schemas']['BreakdownStep'];
export type BreakdownSectionData = components['schemas']['BreakdownSectionData'];

/**
 * One level of the breakdown navigation. A row of the KPI's own table carries
 * the underlying response's `datasource`; nested levels opened from a section
 * carry the section's `rowBreakdownDatasource`.
 */
export interface BreakdownFrame {
  datasource: string;
  rowId: string;
}
