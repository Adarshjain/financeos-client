import { describe, expect, it } from 'vitest';

import { parseChatUrl } from './chatUrl';

describe('parseChatUrl', () => {
  it('reads and trims the question', () => {
    expect(parseChatUrl({ q: '  how much did I spend?  ' })).toEqual({ question: 'how much did I spend?' });
  });

  it('takes the first of a repeated key', () => {
    expect(parseChatUrl({ q: ['a', 'b'] })).toEqual({ question: 'a' });
  });

  it('treats a blank or missing question as none', () => {
    expect(parseChatUrl({ q: '   ' })).toEqual({ question: undefined });
    expect(parseChatUrl({})).toEqual({ question: undefined });
  });
});
