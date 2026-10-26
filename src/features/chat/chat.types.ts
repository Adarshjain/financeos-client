import {
  BarChart3,
  CreditCard,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { ChatChartBlock } from './ChatChartCard';
import { ChatTableBlock } from './ChatDataTable';
import { ChatReportDraft } from './ChatReportDraftCard';
import { ChatStat } from './ChatStatCards';

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

export const SUGGESTIONS = [
  {
    title: 'Spend Analysis',
    prompt: 'What was my total spend last month by category?',
    icon: BarChart3,
  },
  {
    title: 'Card Recommendation',
    prompt: 'Which credit card gives the best rewards for ₹5,000 dining?',
    icon: CreditCard,
  },
  {
    title: 'Net Worth Summary',
    prompt: 'Show my current net worth breakdown across all accounts.',
    icon: Wallet,
  },
  {
    title: 'Portfolio Holdings',
    prompt: 'Summarize my top investment holdings and total valuation.',
    icon: TrendingUp,
  },
];

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
