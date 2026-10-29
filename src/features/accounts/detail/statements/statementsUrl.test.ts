import { describe, expect, it } from 'vitest';

import { parseStatementsUrl } from './statementsUrl';

describe('parseStatementsUrl', () => {
  it('reads the year and the statement', () => {
    expect(parseStatementsUrl({ fy: '2025-26', statement: '7' })).toEqual({ fy: '2025-26', statement: '7' });
  });

  it('takes the first of a repeated key', () => {
    expect(parseStatementsUrl({ fy: ['2024-25', '2025-26'] })).toEqual({ fy: '2024-25', statement: undefined });
  });

  it('is empty for an address with neither', () => {
    expect(parseStatementsUrl({})).toEqual({ fy: undefined, statement: undefined });
  });
});
