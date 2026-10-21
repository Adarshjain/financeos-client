import { describe, expect, it } from 'vitest';

import { parseInstallmentParam } from './installmentParam';

describe('parseInstallmentParam', () => {
  it('reads a positive whole number, the first of several', () => {
    expect(parseInstallmentParam('14')).toBe(14);
    expect(parseInstallmentParam(['7', '8'])).toBe(7);
  });

  it('ignores anything else', () => {
    for (const bad of ['0', '-1', '2.5', 'abc', '', null, undefined]) expect(parseInstallmentParam(bad)).toBeNull();
  });
});
