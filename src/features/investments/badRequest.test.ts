import { describe, expect, it } from 'vitest';

import { ActionError } from '@/lib/actionResult';
import { ApiError } from '@/lib/api/client';

import { isBadRequest, isNotFound } from './badRequest';

const response = (code: string) => ({ code, message: 'm' });

describe('isBadRequest', () => {
  it('reads a 400 ApiError by status', () => {
    expect(isBadRequest(new ApiError(400, response('X')))).toBe(true);
    expect(isBadRequest(new ApiError(409, response('DUPLICATE')))).toBe(false);
  });

  it('reads a failed server action by the server codes of a 400', () => {
    expect(isBadRequest(new ActionError(response('VALIDATION_ERROR')))).toBe(true);
    expect(isBadRequest(new ActionError(response('BAD_REQUEST')))).toBe(true);
    expect(isBadRequest(new ActionError(response('NOT_FOUND')))).toBe(false);
    expect(isBadRequest(new Error('x'))).toBe(false);
  });
});

describe('isNotFound', () => {
  it('reads a 404 ApiError by status and a failed server action by NOT_FOUND', () => {
    expect(isNotFound(new ApiError(404, response('X')))).toBe(true);
    expect(isNotFound(new ActionError(response('NOT_FOUND')))).toBe(true);
    expect(isNotFound(new ActionError(response('VALIDATION_ERROR')))).toBe(false);
    expect(isNotFound(new ApiError(500, response('X')))).toBe(false);
  });
});
