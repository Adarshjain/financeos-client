import { describe, expect, it } from 'vitest';

import { createSseParser } from './sseParser';

describe('createSseParser', () => {
  it('parses named events with JSON data', () => {
    const p = createSseParser();
    expect(p.feed('event: status\ndata: {"status":"Thinking"}\n\nevent: final\ndata: {"answer":"hi"}\n\n')).toEqual([
      { event: 'status', data: { status: 'Thinking' } },
      { event: 'final', data: { answer: 'hi' } },
    ]);
  });

  it('keeps a partial line until the next chunk completes it', () => {
    const p = createSseParser();
    expect(p.feed('event: tra')).toEqual([]);
    expect(p.feed('ce\ndata: {"a":')).toEqual([]);
    expect(p.feed('1}\n\n')).toEqual([{ event: 'trace', data: { a: 1 } }]);
  });

  it('ignores heartbeat comments and malformed data', () => {
    const p = createSseParser();
    expect(p.feed(': ping\nevent: trace\ndata: not-json\n\nevent: final\ndata: {"ok":true}\n\n')).toEqual([
      { event: 'final', data: { ok: true } },
    ]);
  });

  it('resets the event name to message after a blank line', () => {
    const p = createSseParser();
    expect(p.feed('event: status\ndata: {"a":1}\n\ndata: {"b":2}\n')).toEqual([
      { event: 'status', data: { a: 1 } },
      { event: 'message', data: { b: 2 } },
    ]);
  });

  it('handles CRLF line endings', () => {
    const p = createSseParser();
    expect(p.feed('event: final\r\ndata: {"x":1}\r\n\r\n')).toEqual([{ event: 'final', data: { x: 1 } }]);
  });
});
