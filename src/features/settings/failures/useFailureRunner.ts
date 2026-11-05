'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { notify } from '@/lib/notify';
import { toastErrorResult } from '@/lib/toastError';
import type { ApiResult } from '@/lib/types';

import { failureKeys } from './failuresModel';

/**
 * Runs one admin action: a toast on success or failure, then the list and the counts are refreshed either way
 * (a 409 means the row changed under us). Resolves true when the action worked.
 */
export function useFailureRunner() {
  const queryClient = useQueryClient();
  return React.useCallback(
    async <T,>(result: Promise<ApiResult<T>>, message: string | ((data: T) => string)): Promise<boolean> => {
      const r = await result;
      if (r.success) notify.success(typeof message === 'function' ? message(r.data) : message);
      else toastErrorResult(r.error, "That didn't work. Try again.");
      await queryClient.invalidateQueries({ queryKey: failureKeys.all });
      return r.success;
    },
    [queryClient],
  );
}
