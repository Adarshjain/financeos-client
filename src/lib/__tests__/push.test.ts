import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  describeDevice,
  getCurrentPushSubscription,
  isPushSupported,
  subscribeToPush,
  toSubscriptionPayload,
  unsubscribeFromPush,
  urlBase64ToUint8Array,
} from '@/lib/push';

function fakeSubscription(endpoint = 'https://push.example/abc') {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: 'BPUB', auth: 'AUTH' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  } as unknown as PushSubscription;
}

describe('push helpers', () => {
  const originalNavigator = globalThis.navigator;
  let pushManager: { getSubscription: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    pushManager = { getSubscription: vi.fn().mockResolvedValue(null), subscribe: vi.fn() };
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        ...originalNavigator,
        userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36',
        serviceWorker: { ready: Promise.resolve({ pushManager }) },
      },
    });
    (globalThis as unknown as { PushManager: unknown }).PushManager = function PushManager() {};
    (globalThis as unknown as { Notification: unknown }).Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: originalNavigator });
    delete (globalThis as unknown as { PushManager?: unknown }).PushManager;
    delete (globalThis as unknown as { Notification?: unknown }).Notification;
  });

  it('decodes a base64url VAPID key into raw bytes', () => {
    // "BAEC" base64url -> bytes [4, 1, 2]
    expect(Array.from(urlBase64ToUint8Array('BAEC'))).toEqual([4, 1, 2]);
    expect(urlBase64ToUint8Array('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8').length).toBe(65);
  });

  it('detects support only when every API is present', () => {
    expect(isPushSupported()).toBe(true);
    delete (globalThis as unknown as { PushManager?: unknown }).PushManager;
    expect(isPushSupported()).toBe(false);
  });

  it('turns the browser subscription into the server payload with a device label', () => {
    const payload = toSubscriptionPayload(fakeSubscription());
    expect(payload).toEqual({
      endpoint: 'https://push.example/abc',
      keys: { p256dh: 'BPUB', auth: 'AUTH' },
      userAgent: 'Chrome · Android',
    });
    expect(() => toSubscriptionPayload({ endpoint: 'x', toJSON: () => ({ endpoint: 'x', keys: {} }) } as unknown as PushSubscription)).toThrow(/incomplete/);
  });

  it('subscribes after permission is granted, reusing an existing subscription', async () => {
    pushManager.subscribe.mockResolvedValue(fakeSubscription());
    const payload = await subscribeToPush('BAEC');
    expect(payload.endpoint).toBe('https://push.example/abc');
    expect(pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));

    pushManager.getSubscription.mockResolvedValue(fakeSubscription('https://push.example/existing'));
    const reused = await subscribeToPush('BAEC');
    expect(reused.endpoint).toBe('https://push.example/existing');
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
  });

  it('refuses without a key, without support, or when permission is denied', async () => {
    await expect(subscribeToPush('')).rejects.toThrow(/not configured/);
    (globalThis as unknown as { Notification: { requestPermission: unknown } }).Notification.requestPermission = vi.fn().mockResolvedValue('denied');
    await expect(subscribeToPush('BAEC')).rejects.toThrow(/blocked/);
    delete (globalThis as unknown as { PushManager?: unknown }).PushManager;
    await expect(subscribeToPush('BAEC')).rejects.toThrow(/does not support/);
  });

  it('unsubscribes and reports the endpoint that was removed', async () => {
    expect(await getCurrentPushSubscription()).toBeNull();
    expect(await unsubscribeFromPush()).toBeNull();
    const sub = fakeSubscription();
    pushManager.getSubscription.mockResolvedValue(sub);
    expect(await unsubscribeFromPush()).toBe('https://push.example/abc');
    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('labels common browsers and platforms', () => {
    expect(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17.0 Mobile/15E148 Safari/604.1')).toBe('Safari · iOS');
    expect(describeDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36')).toBe('Chrome · macOS');
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe('Firefox · Windows');
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36 Edg/130.0')).toBe('Edge · Windows');
    expect(describeDevice('curl/8.0')).toBe('Browser');
  });
});
