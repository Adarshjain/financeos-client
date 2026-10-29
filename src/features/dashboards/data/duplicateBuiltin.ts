// "Duplicate as my report" for a built-in template widget: the server resolves the template with the widget's
// params (POST /dashboards/builtins/{key}/definition) and the result is saved as a new report, named after the
// built-in, which the user can then edit freely. A template whose rows depend on a reward window (milestones,
// caps) is resolved against the window open today: the copy is fixed to it, and the confirmation says so.

import { formatDmy } from '@/features/accounts/form/ds/accountFormModel';
import { unwrapAction } from '@/lib/actionResult';
import type { WidgetParams } from '@/lib/dashboards.types';

import { duplicateBuiltinReport } from '../actions';

export interface DuplicateBuiltinVars {
  builtinKey: string;
  params: WidgetParams;
}

/** The note for a copy fixed to a reward window ("…open on 01/10/2026"); null otherwise. */
export function windowNote(windowAsOf: string | null | undefined): string | null {
  return windowAsOf ? `This copy is fixed to the window open on ${formatDmy(windowAsOf)}.` : null;
}

/** Resolves the template with the widget's params and saves it as a new report. Throws when either step yields nothing. */
export function duplicateBuiltin({ builtinKey, params }: DuplicateBuiltinVars) {
  return unwrapAction(duplicateBuiltinReport(builtinKey, params));
}
