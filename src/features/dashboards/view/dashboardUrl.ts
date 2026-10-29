import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

export interface DashboardUrl {
  /** The dashboard opens in edit mode (`?edit=1`). */
  startEditing: boolean;
}

/** What a dashboard address asks for: `?edit=1` opens it editing. */
export function parseDashboardUrl(params: SearchParamsRecord): DashboardUrl {
  return { startEditing: first(params.edit) === '1' };
}
