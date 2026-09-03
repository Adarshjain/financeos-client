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
export function createDomainAction<TOp extends (...args: never[]) => Promise<unknown>>(
  options: ActionOptions,
  operation: TOp
): (...args: Parameters<TOp>) => Promise<ApiResult<Awaited<ReturnType<TOp>>>> {
  type TArgs = Parameters<TOp>;
  type TResult = Awaited<ReturnType<TOp>>;
  return async (...args: TArgs): Promise<ApiResult<TResult>> => {
    const run = async (): Promise<TResult> => {
      // TOp is inferred from the caller's function, so its parameter tuple is exactly TArgs; the
      // narrowing below only re-states that relationship for the compiler.
      const run = operation as (...a: TArgs) => Promise<TResult>;
      const result = await run(...args);
      if (options.revalidatePaths) {
        for (const path of options.revalidatePaths) {
          revalidatePath(path);
        }
      }
      return result;
    };
    return apiResult<TResult>(options.fallbackError, run);
  };
}
