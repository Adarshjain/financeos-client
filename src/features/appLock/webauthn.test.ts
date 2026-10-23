import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  base64UrlToBuffer,
  bufferToBase64Url,
  credentialToJSON,
  hostMatchesRp,
  toCreationOptions,
  toRequestOptions,
} from './webauthn';

const bytes = (b: ArrayBuffer) => Array.from(new Uint8Array(b));

describe('base64url', () => {
  it('round trips, including bytes that need - and _', () => {
    const raw = new Uint8Array([251, 255, 190, 0, 1, 2]);
    const text = bufferToBase64Url(raw);
    expect(text).toBe('-_--AAEC');
    expect(bytes(base64UrlToBuffer(text))).toEqual(Array.from(raw));
  });

  it('handles lengths that need padding', () => {
    expect(bytes(base64UrlToBuffer('AQI'))).toEqual([1, 2]);
    expect(bufferToBase64Url(new Uint8Array([1, 2]))).toBe('AQI');
  });
});

describe('option parsing without the native helpers', () => {
  it('turns challenge, user id and credential ids into buffers (creation)', () => {
    const o = toCreationOptions({
      publicKey: { challenge: 'AQI', user: { id: 'AwQ', name: 'a' }, excludeCredentials: [{ id: 'BQY', type: 'public-key' }] },
    });
    expect(bytes(o.challenge as ArrayBuffer)).toEqual([1, 2]);
    expect(bytes(o.user.id as ArrayBuffer)).toEqual([3, 4]);
    expect(bytes(o.excludeCredentials![0].id as ArrayBuffer)).toEqual([5, 6]);
  });

  it('turns challenge and allowed credential ids into buffers (request, bare options)', () => {
    const o = toRequestOptions({ challenge: 'AQI', rpId: 'localhost', allowCredentials: [{ id: 'BQY', type: 'public-key' }] });
    expect(bytes(o.challenge as ArrayBuffer)).toEqual([1, 2]);
    expect(o.rpId).toBe('localhost');
    expect(bytes(o.allowCredentials![0].id as ArrayBuffer)).toEqual([5, 6]);
  });
});

describe('option parsing with the native helpers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('hands the unwrapped options to parseRequestOptionsFromJSON', () => {
    const parse = vi.fn(() => ({ parsed: true }));
    vi.stubGlobal('PublicKeyCredential', { parseRequestOptionsFromJSON: parse });
    expect(toRequestOptions({ publicKey: { challenge: 'AQI' } })).toEqual({ parsed: true });
    expect(parse).toHaveBeenCalledWith({ challenge: 'AQI' });
  });
});

describe('credentialToJSON', () => {
  it('uses the native toJSON when there is one', () => {
    expect(credentialToJSON({ toJSON: () => ({ id: 'x' }) } as unknown as PublicKeyCredential)).toEqual({ id: 'x' });
  });

  it('serialises an assertion by hand otherwise', () => {
    const cred = {
      id: 'abc',
      type: 'public-key',
      rawId: new Uint8Array([1, 2]).buffer,
      authenticatorAttachment: 'platform',
      getClientExtensionResults: () => ({}),
      response: {
        clientDataJSON: new Uint8Array([1]).buffer,
        authenticatorData: new Uint8Array([2]).buffer,
        signature: new Uint8Array([3]).buffer,
        userHandle: new Uint8Array([4]).buffer,
      },
    } as unknown as PublicKeyCredential;
    expect(credentialToJSON(cred)).toEqual({
      id: 'abc',
      rawId: 'AQI',
      type: 'public-key',
      authenticatorAttachment: 'platform',
      clientExtensionResults: {},
      response: { clientDataJSON: 'AQ', authenticatorData: 'Ag', signature: 'Aw', userHandle: 'BA' },
    });
  });

  it('serialises an attestation by hand otherwise', () => {
    const cred = {
      id: 'abc',
      type: 'public-key',
      rawId: new Uint8Array([1]).buffer,
      getClientExtensionResults: () => ({}),
      response: {
        clientDataJSON: new Uint8Array([1]).buffer,
        attestationObject: new Uint8Array([9]).buffer,
        getTransports: () => ['internal'],
      },
    } as unknown as PublicKeyCredential;
    const json = credentialToJSON(cred) as { response: Record<string, unknown> };
    expect(json.response).toEqual({ clientDataJSON: 'AQ', attestationObject: 'CQ', transports: ['internal'] });
  });
});

describe('hostMatchesRp', () => {
  it('accepts the rp id and its subdomains only', () => {
    expect(hostMatchesRp('app.example', 'app.example')).toBe(true);
    expect(hostMatchesRp('example.com', 'www.example.com')).toBe(true);
    expect(hostMatchesRp('app.example', '192.168.1.5')).toBe(false);
    expect(hostMatchesRp('app.example', 'evilapp.example')).toBe(false);
  });
});
