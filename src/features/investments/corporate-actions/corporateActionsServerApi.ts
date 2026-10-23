import type { CreateCorporateActionRequest } from '@/lib/api/types';
import { corporateActionsApi } from '@/lib/apiClient';
import type { CorporateActionItem, CorporateActionPageQuery, CorporateActionPreview, ItemsPage } from '@/lib/investments.types';

// The fetch helpers of the Corporate actions page and its record dialog. The page imports these (never
// apiClient directly), so a test replaces one module.

export function fetchCorporateActionsPage(query: CorporateActionPageQuery): Promise<ItemsPage<CorporateActionItem>> {
  return corporateActionsApi.page(query);
}

/** What recording the action would do to the holdings of `instrumentId`, without saving it. */
export function fetchCorporateActionPreview(instrumentId: string, body: CreateCorporateActionRequest & { excludeActionId?: string }): Promise<CorporateActionPreview> {
  return corporateActionsApi.preview(instrumentId, body);
}
