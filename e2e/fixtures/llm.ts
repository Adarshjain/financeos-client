import type { ApiClient } from './api';
import { scriptLlm } from './control';

export interface CategorizeScriptItem {
  index: number;
  merchantKey: string;
  categoryNames: string[];
  displayName?: string;
  noFit?: boolean;
}

export function categorizeScript(items: CategorizeScriptItem[]): {
  results: {
    index: number;
    merchantKey: string;
    displayName: string;
    categoryNames: string[];
    noFit: boolean;
  }[];
} {
  return {
    results: items.map((item) => ({
      index: item.index,
      merchantKey: item.merchantKey,
      displayName: item.displayName ?? item.merchantKey,
      categoryNames: item.categoryNames,
      noFit: item.noFit ?? false,
    })),
  };
}

export async function scriptCategorize(
  api: ApiClient,
  items: CategorizeScriptItem[]
): Promise<{ queued: Record<string, number> }> {
  const json = categorizeScript(items);
  return scriptLlm(api, 'categorize', [{ json }]);
}

export async function scriptCategorizeError(
  api: ApiClient,
  error: { kind: string; message: string }
): Promise<{ queued: Record<string, number> }> {
  return scriptLlm(api, 'categorize', [{ error }]);
}
