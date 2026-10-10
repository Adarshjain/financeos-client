'use client';

// The picker's "Your reports": each saved report with its type, and a pointer
// to create one when there are none. Leaving for the report builder from an
// editor with unsaved changes asks first (as the editor's Back does).

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Badge } from '@/components/ui/badge';
import type { ReportSummaryResponse } from '@/lib/reports.types';

const rowClass =
  'flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800';

interface ReportRowsProps {
  /** The reports to list (already filtered by the search). */
  reports: ReportSummaryResponse[];
  /** Whether the user has any saved report at all. */
  hasAny: boolean;
  /** Section heading, when the reports share the view with built-ins. */
  heading?: string;
  /** The dashboard has unsaved changes: "Create one" confirms before leaving. */
  hasUnsavedChanges?: boolean;
  onPick: (report: ReportSummaryResponse) => void;
}

export const sectionTitle = 'text-2xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500';

const NEW_REPORT = '/reports/new';
const linkClass = 'text-emerald-600 underline';

/** "Create one": a plain link, or — with unsaved changes — a confirm before leaving. */
function CreateReportLink({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) {
  if (hasUnsavedChanges) return <ConfirmLeaveLink />;
  return (
    <Link href={NEW_REPORT} className={linkClass}>
      Create one
    </Link>
  );
}

function ConfirmLeaveLink() {
  const router = useRouter();
  return (
    <ConfirmationDialog
      title="Leave without saving?"
      description="Your unsaved changes to this dashboard will be lost."
      primaryActionText="Leave"
      primaryAction={() => router.push(NEW_REPORT)}
      trigger={
        <button type="button" className={linkClass}>
          Create one
        </button>
      }
    />
  );
}

export function ReportRows({ reports, hasAny, heading, hasUnsavedChanges = false, onPick }: ReportRowsProps) {
  return (
    <section className="space-y-1.5">
      {heading && <h3 className={sectionTitle}>{heading}</h3>}
      {!hasAny ? (
        <p className="text-sm text-slate-500">
          No saved reports yet. <CreateReportLink hasUnsavedChanges={hasUnsavedChanges} /> first.
        </p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-slate-500">No reports match.</p>
      ) : (
        <div className="space-y-1">
          {reports.map((r) => (
            <button key={r.id} type="button" onClick={() => onPick(r)} className={rowClass}>
              <span className="truncate text-sm font-medium text-slate-900 dark:text-white">{r.name}</span>
              <Badge variant="secondary">{r.type}</Badge>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
