import React from 'react';

import { LoadError } from '@/features/shell/LoadError';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { REPORTS_HREF } from '../list/reportsList';

/** A report page whose data failed to load: the app bar stays, the body says what failed and offers Retry. */
export function ReportEditorLoadError({ title, reference }: { title: string; reference?: string }) {
  return (
    <ShellPage crumb={subCrumb('reports')} title={title} backHref={REPORTS_HREF}>
      <LoadError what="reports" reference={reference} />
    </ShellPage>
  );
}
