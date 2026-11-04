import type { Schemas } from '@/lib/api/types';

export type CoverageData = Schemas['CoverageResponse'];
export type CoverageState = Schemas['MonthCoverage']['state'];
export type CellKind = 'data' | 'empty' | 'fetching' | 'marked';
/** What tapping a cell offers: upload a statement, mark the month empty, or undo that mark. */
export type CellAction = 'upload' | 'mark-empty' | 'unmark';

export interface CoverageCell {
  /** yyyy-mm */
  month: string;
  /** "Jan" */
  label: string;
  kind: CellKind;
  actions: CellAction[];
}

export interface CoverageYear {
  year: string;
  cells: CoverageCell[];
}

export interface LegendItem {
  kind: CellKind;
  label: string;
}

export interface CoverageModel {
  years: CoverageYear[];
  legend: LegendItem[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const KIND: Record<CoverageState, CellKind> = {
  DATA: 'data',
  EMPTY: 'empty',
  FETCHING: 'fetching',
  MARKED_EMPTY: 'marked',
};

const ACTIONS: Record<CellKind, CellAction[]> = {
  data: [],
  empty: ['upload', 'mark-empty'],
  fetching: [],
  marked: ['unmark'],
};

export const ACTION_LABEL: Record<CellAction, string> = {
  upload: 'Upload statement',
  'mark-empty': 'Nothing happened that month',
  unmark: 'Undo: something happened',
};

export const COVERAGE_LEGEND: LegendItem[] = [
  { kind: 'data', label: 'Data' },
  { kind: 'empty', label: 'Nothing found' },
  { kind: 'fetching', label: 'Fetching' },
];

/** The strip: months grouped by year in the order given (oldest first). */
export function buildCoverageModel(coverage: CoverageData): CoverageModel {
  const years: CoverageYear[] = [];
  for (const m of coverage.months) {
    const [year, mm] = m.month.split('-');
    const monthIndex = Number(mm) - 1;
    if (!year || !MONTHS[monthIndex]) continue;
    const kind = KIND[m.state];
    const cell: CoverageCell = { month: m.month, label: MONTHS[monthIndex], kind, actions: ACTIONS[kind] };
    const last = years[years.length - 1];
    if (last && last.year === year) last.cells.push(cell);
    else years.push({ year, cells: [cell] });
  }
  return { years, legend: COVERAGE_LEGEND };
}
