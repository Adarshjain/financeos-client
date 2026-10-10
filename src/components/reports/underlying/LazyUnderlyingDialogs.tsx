'use client';

// "View underlying data" and a row breakdown, loaded on demand. Dashboard
// widgets mount these only after a tap, so their code (the report table views,
// the breakdown stack) is fetched then rather than with the dashboard. Same
// props as KpiUnderlyingDialog / RowBreakdownDialog.

import dynamic from 'next/dynamic';

import type { KpiUnderlyingDialogProps } from './KpiUnderlyingDialog';
import type { RowBreakdownDialogProps } from './RowBreakdownDialog';

export const LazyKpiUnderlyingDialog = dynamic<KpiUnderlyingDialogProps>(
  () => import('./KpiUnderlyingDialog').then((m) => m.KpiUnderlyingDialog),
  { ssr: false },
);

export const LazyRowBreakdownDialog = dynamic<RowBreakdownDialogProps>(
  () => import('./RowBreakdownDialog').then((m) => m.RowBreakdownDialog),
  { ssr: false },
);
