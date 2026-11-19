import { describe, expect, it } from 'vitest';

import { subRowDisplayLabel } from './subRowLabelModel';

describe('subRowDisplayLabel', () => {
  it('drops the parent prefix', () => {
    expect(subRowDisplayLabel('Food', 'Food · Delivery')).toBe('Delivery');
  });

  it('drops it from an Others label', () => {
    expect(subRowDisplayLabel('Food', 'Food · Others')).toBe('Others');
  });

  it('keeps a label that does not start with the parent', () => {
    expect(subRowDisplayLabel('Food', 'Travel · Flights')).toBe('Travel · Flights');
    expect(subRowDisplayLabel('Food', 'Delivery')).toBe('Delivery');
  });

  it('needs the full prefix with its separator', () => {
    expect(subRowDisplayLabel('Food', 'Food & Drink · Cafes')).toBe('Food & Drink · Cafes');
    expect(subRowDisplayLabel('Food', 'Food· Delivery')).toBe('Food· Delivery');
  });

  it('works when the parent label itself contains the separator', () => {
    expect(subRowDisplayLabel('Home · Rent', 'Home · Rent · Deposit')).toBe('Deposit');
  });

  it('strips only the first prefix', () => {
    expect(subRowDisplayLabel('Food', 'Food · Food · Extra')).toBe('Food · Extra');
  });

  it('keeps a label equal to the parent or to the bare prefix', () => {
    expect(subRowDisplayLabel('Food', 'Food')).toBe('Food');
    expect(subRowDisplayLabel('Food', 'Food · ')).toBe('Food · ');
  });

  it('is case sensitive', () => {
    expect(subRowDisplayLabel('Food', 'food · Delivery')).toBe('food · Delivery');
  });
});
