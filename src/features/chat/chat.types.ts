export interface ChatStat {
  label: string;
  value: string;
  delta?: string;
  sentiment?: 'good' | 'bad' | 'neutral';
}

export interface ChatChartBlock {
  chartType: 'bar' | 'stackedBar' | 'line' | 'area' | 'pie' | 'donut';
  title?: string;
  categories: string[];
  series: { name: string; data: (number | null)[] }[];
}

export interface ChatTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  format?: 'inr' | 'number' | 'text';
}

export interface ChatTableBlock {
  title?: string;
  columns: ChatTableColumn[];
  rows: Record<string, string | number | boolean | null>[];
}

export interface ChatReportDraft {
  mode: 'create' | 'update' | 'delete';
  name?: string;
  description?: string;
  type?: 'KPI' | 'CHART' | 'TABLE';
  datasource?: string;
  /** Shape depends on `type` (KPI/CHART/TABLE); the LLM's draft JSON isn't validated until save, so this stays untyped until cast at the point of use. */
  definition?: unknown;
  reportId?: string;
  status?: 'saved' | 'updated' | 'deleted' | 'failed';
  savedReportId?: string;
  errorMessage?: string;
}

export interface ChatBlocks {
  stats?: ChatStat[];
  charts?: ChatChartBlock[];
  tables?: ChatTableBlock[];
  followUps?: string[];
  reportDraft?: ChatReportDraft;
}

export interface ChatTrace {
  step: number;
  action: string;
  summary: string;
  detail?: string;
  rowCount?: number | null;
  durationMs?: number | null;
  success?: boolean;
  error?: string;
  resultPreview?: string;
  label?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content?: string;
  clarify?: string;
  clarifyOptions?: string[];
  blocks?: ChatBlocks;
  traces?: ChatTrace[];
  isStreaming?: boolean;
  status?: string;
  error?: string;
  startTime?: number;
}

export function formatActionLabel(action: string): string {
  if (action === 'run_sql') return 'Query';
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatTotalDuration(traces?: ChatTrace[]): string {
  if (!traces || traces.length === 0) return '0.0s';
  const totalMs = traces.reduce((acc, t) => acc + (t.durationMs || 0), 0);
  if (totalMs > 0) {
    return `${(totalMs / 1000).toFixed(1)}s`;
  }
  return '0.0s';
}
