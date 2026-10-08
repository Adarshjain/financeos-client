import { describe, expect, it } from 'vitest';

import { parsePushPayload, resolveNotificationUrl } from '@/lib/pushPayload';

describe('parsePushPayload', () => {
  it('reads the server JSON shape', () => {
    expect(parsePushPayload('{"title":"HDFC: bill due today","body":"₹1,000 by 28 Oct","url":"/dashboard?bill=x","tag":"bill-x"}')).toEqual({
      title: 'HDFC: bill due today',
      body: '₹1,000 by 28 Oct',
      url: '/dashboard?bill=x',
      tag: 'bill-x',
    });
  });

  it('falls back to a generic title for empty, non-JSON or malformed payloads', () => {
    expect(parsePushPayload(undefined)).toEqual({ title: 'FinanceOS' });
    expect(parsePushPayload('')).toEqual({ title: 'FinanceOS' });
    expect(parsePushPayload('plain text')).toEqual({ title: 'FinanceOS', body: 'plain text' });
    expect(parsePushPayload('"just a string"')).toEqual({ title: 'FinanceOS', body: '"just a string"' });
    expect(parsePushPayload('{"title":"   ","body":5}')).toEqual({ title: 'FinanceOS', body: undefined, url: undefined, tag: undefined });
  });
});

describe('resolveNotificationUrl', () => {
  const origin = 'https://app.example.com';

  it('resolves relative paths against the app origin', () => {
    expect(resolveNotificationUrl('/dashboard?bill=1', origin)).toBe('https://app.example.com/dashboard?bill=1');
    expect(resolveNotificationUrl('settings/notifications', origin)).toBe('https://app.example.com/settings/notifications');
  });

  it('keeps same-origin absolute URLs and rejects foreign ones', () => {
    expect(resolveNotificationUrl('https://app.example.com/accounts', origin)).toBe('https://app.example.com/accounts');
    expect(resolveNotificationUrl('https://evil.example.com/x', origin)).toBe('https://app.example.com/dashboard');
    expect(resolveNotificationUrl('javascript:alert(1)', origin)).toBe('https://app.example.com/dashboard');
    expect(resolveNotificationUrl(undefined, origin)).toBe('https://app.example.com/dashboard');
  });
});
