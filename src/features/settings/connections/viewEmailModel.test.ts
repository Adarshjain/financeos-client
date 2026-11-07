import { describe, expect, it } from 'vitest';

import { classifyEmailFailure, emailFrameHeight, emailMeta, emailSrcDoc } from './viewEmailModel';

describe('viewEmailModel', () => {
  it('classifies the server codes', () => {
    expect(classifyEmailFailure('GMAIL_MESSAGE_GONE')).toBe('gone');
    expect(classifyEmailFailure('GMAIL_RECONNECT_REQUIRED')).toBe('reconnect');
    expect(classifyEmailFailure('GMAIL_UNAVAILABLE')).toBe('generic');
    expect(classifyEmailFailure(undefined)).toBe('generic');
  });

  it('builds the meta line and skips missing parts', () => {
    expect(emailMeta({ from: 'a@x.test', to: 'b@y.test', date: '2026-10-13T10:00:00Z' })).toMatch(/^a@x\.test · 13\/10\/2026, .* · b@y\.test$/);
    expect(emailMeta({ from: 'a@x.test', to: '', date: null })).toBe('a@x.test');
  });

  it('wraps the body in a page whose CSP loads nothing and shows no images', () => {
    const doc = emailSrcDoc('<p>Hi</p>');
    expect(doc).toContain('<p>Hi</p>');
    expect(doc).toContain("default-src 'none'; style-src 'unsafe-inline'; img-src 'none'");
    expect(doc).not.toContain('<script');
  });

  it('sizes the frame to a short mail and caps a long one at 60% of the screen', () => {
    expect(emailFrameHeight('<p>Hi</p>')).toBe('min(120px, 60vh)');
    const long = `<p>${'word '.repeat(2000)}</p>`;
    expect(emailFrameHeight(long)).toMatch(/^min\(\d{4,}px, 60vh\)$/);
  });
});
