'use client';

// Pieces the investments & loans built-in bodies share: the failed state (what failed, why, Retry) and the
// dialogs their taps open, loaded on demand so the dashboard does not carry them.

import dynamic from 'next/dynamic';

import { ErrorState } from '@/components/organisms';
import { getErrorMessage } from '@/lib/api/errorMessage';

/** A failed load inside a widget: "Couldn't load <what>", the reason, and Retry. The rest of the dashboard keeps rendering. */
export function BodyError({ what, error, retry }: { what: string; error: unknown; retry: () => void }) {
  return (
    <ErrorState
      size="sm"
      title={`Couldn't load ${what}`}
      description={getErrorMessage(error, "Couldn't load this widget.")}
      action={{ label: 'Retry', onSelect: retry }}
    />
  );
}

/** "View underlying data" of an ad-hoc KPI request (Dinero's report dialog). */
export const LazyReportUnderlyingDialog = dynamic(
  () => import('@/features/reports/underlying/ReportUnderlyingDialog').then((m) => m.ReportUnderlyingDialog),
  { ssr: false },
);
