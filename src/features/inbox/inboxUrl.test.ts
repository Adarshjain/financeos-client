import { describe, expect, it } from 'vitest';

import { parseInboxUrl } from './inboxUrl';

describe('parseInboxUrl', () => {
  it('reads the item to highlight', () => {
    expect(parseInboxUrl({ item: 'bill-1' })).toEqual({ highlightKey: 'bill-1' });
  });

  it('takes the first of a repeated key', () => {
    expect(parseInboxUrl({ item: ['a', 'b'] })).toEqual({ highlightKey: 'a' });
  });

  it('has none for a missing or empty item', () => {
    expect(parseInboxUrl({})).toEqual({ highlightKey: null });
    expect(parseInboxUrl({ item: '' })).toEqual({ highlightKey: null });
  });
});
