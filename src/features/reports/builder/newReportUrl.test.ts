import { describe, expect, it } from 'vitest';

import { parseNewReportUrl } from './newReportUrl';

describe('parseNewReportUrl', () => {
  it('reads the template', () => {
    expect(parseNewReportUrl({ template: 'dining-by-month' })).toEqual({ template: 'dining-by-month' });
  });

  it('takes the first of a repeated key and has none when missing', () => {
    expect(parseNewReportUrl({ template: ['a', 'b'] })).toEqual({ template: 'a' });
    expect(parseNewReportUrl({})).toEqual({ template: undefined });
  });
});
