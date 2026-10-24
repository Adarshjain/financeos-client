import { describe, expect, it } from 'vitest';

import { signed } from './format';

describe('signed', () => {
  it('shows the sign of a change', () => {
    expect(signed('₹6,100', 6100)).toBe('+₹6,100');
    expect(signed('-₹6,100', -6100)).toBe('-₹6,100');
    expect(signed('₹0', 0)).toBe('₹0');
  });
});
