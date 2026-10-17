import { afterEach, describe, expect, it, vi } from 'vitest';

import { stubLayout } from '@/test/stubLayout';

import { isPhoneLayout } from './phoneLayout';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isPhoneLayout', () => {
  it('reads as phone when matchMedia is missing', () => {
    expect(isPhoneLayout()).toBe(true);
  });

  it('is true below lg and false at or above it, read at call time', () => {
    stubLayout('phone');
    expect(isPhoneLayout()).toBe(true);
    stubLayout('desktop');
    expect(isPhoneLayout()).toBe(false);
  });
});
