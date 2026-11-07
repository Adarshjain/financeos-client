import { describe, expect, it } from 'vitest';

import { parseConnectionsUrl } from './connectionsUrl';

describe('parseConnectionsUrl', () => {
  it('focuses the needs-attention card for ?focus=attention', () => {
    expect(parseConnectionsUrl({ focus: 'attention' }).focusAttention).toBe(true);
    expect(parseConnectionsUrl({ focus: 'other' }).focusAttention).toBe(false);
    expect(parseConnectionsUrl({}).focusAttention).toBe(false);
  });

  it('reads a successful consent return', () => {
    expect(parseConnectionsUrl({ gmail: 'success', email: 'a@b.test' }).oauth).toEqual({ kind: 'success', email: 'a@b.test' });
  });

  it('reads a failed consent return and ignores no return', () => {
    expect(parseConnectionsUrl({ gmail: ['error', 'x'], message: 'denied' }).oauth).toEqual({ kind: 'error', message: 'denied' });
    expect(parseConnectionsUrl({}).oauth).toBeNull();
  });
});
