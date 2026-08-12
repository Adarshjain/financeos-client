import { revalidatePath } from 'next/cache';

import { apiResult } from '@/lib/apiResult';
import type { ApiResult } from '@/lib/types';

export interface ActionOptions {
  /** Fallback error message if an unexpected exception occurs. */
  fallbackError: string;
  /** List of Next.js paths to revalidate upon successful execution. */
  revalidatePaths?: string[];
}

/**
 * Creates a type-safe domain action function that automatically wraps the operation
 * in `apiResult` error handling and revalidates specified Next.js cache paths on success.
 */
export function createDomainAction<TArgs extends any[], TResult>(
  options: ActionOptions,
  operation: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<ApiResult<TResult>> {
  return async (...args: TArgs): Promise<ApiResult<TResult>> => {
    return apiResult(options.fallbackError, async () => {
      const result = await operation(...args);
      if (options.revalidatePaths) {
        for (const path of options.revalidatePaths) {
          revalidatePath(path);
        }
      }
      return result;
    });
  };
}
