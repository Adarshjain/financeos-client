import { describe, expect, it } from 'vitest';

import { filterChipText } from './filterChipText';

const today = { today: '2026-10-20' };
const chip = (text: string) => filterChipText(text, today);

describe('filterChipText', () => {
  it('writes a between range compressed and in lower case', () => {
    expect(chip('Between 01/09/2026 and 30/09/2026')).toBe('between 1–30 Sep');
    expect(chip('Between 15/03/2026 and 14/04/2026')).toBe('between 15 Mar – 14 Apr');
  });

  it('writes a range across years with the years where they differ', () => {
    expect(chip('Between 15/03/2026 and 14/03/2027')).toBe('between 15 Mar 26 – 14 Mar 27');
  });

  it('writes a single date as a day label after on, before and after', () => {
    expect(chip('On 13/10/2026')).toBe('on 13 Oct');
    expect(chip('Before 13/10/2026')).toBe('before 13 Oct');
    expect(chip('After 05/01/2026')).toBe('after 5 Jan');
  });

  it('lower-cases named and relative date texts', () => {
    expect(chip('This month')).toBe('this month');
    expect(chip('Last 30 days')).toBe('last 30 days');
    expect(chip('This financial year')).toBe('this financial year');
    expect(chip('2 billing cycles ago')).toBe('2 billing cycles ago');
    expect(chip('All time')).toBe('all time');
  });

  it('leaves verbs and values that are already right alone', () => {
    expect(chip('is Picker Bank')).toBe('is Picker Bank');
    expect(chip('in Food, Fuel')).toBe('in Food, Fuel');
    expect(chip('is No')).toBe('is No');
    expect(chip('between 100 and 500')).toBe('between 100 and 500');
    expect(chip('contains HDFC')).toBe('contains HDFC');
  });
});
