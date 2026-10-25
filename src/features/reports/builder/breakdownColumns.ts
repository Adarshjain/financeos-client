import type { BreakdownColumn } from '@/lib/reports.types';

/** The columns a breakdown shows while none are chosen: amount and share, and the change when a comparison runs. */
export const defaultBreakdownColumns = (comparing: boolean): BreakdownColumn[] =>
  comparing ? ['amount', 'share', 'change'] : ['amount', 'share'];

/** Whether two column lists hold the same columns, whatever their order. */
export const sameColumns = (a: BreakdownColumn[], b: BreakdownColumn[]): boolean =>
  a.length === b.length && a.every((c) => b.includes(c));
