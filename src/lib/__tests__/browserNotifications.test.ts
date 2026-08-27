import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ensureNotificationPermission,
  isPageVisible,
  markdownToPlainText,
  notifyWhenAway,
  showBrowserNotification,
  truncateForNotification,
} from '../browserNotifications';

type Permission = 'default' | 'granted' | 'denied';

type NotifyOptions = { body?: string; tag?: string; icon?: string };

type NotificationInstance = {
  title: string;
  options?: NotifyOptions;
  onclick: (() => void) | null;
  close: () => void;
};

function installMockNotification(permission: Permission) {
  const instances: NotificationInstance[] = [];
  const requestPermission = vi.fn().mockResolvedValue(permission);
  const MockNotification = vi.fn(function (
    this: NotificationInstance,
    title: string,
    options?: NotifyOptions,
  ) {
    this.title = title;
    this.options = options;
    this.onclick = null;
    this.close = vi.fn();
    instances.push(this);
  }) as unknown as typeof Notification & {
    permission: Permission;
  };
  MockNotification.permission = permission;
  (MockNotification as unknown as { requestPermission: unknown }).requestPermission =
    requestPermission;
  vi.stubGlobal('Notification', MockNotification);
  return { instances, requestPermission };
}

function stubVisibility(visible: boolean, focused = visible) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(
    visible ? 'visible' : 'hidden',
  );
  vi.spyOn(document, 'hasFocus').mockReturnValue(focused);
}

describe('markdownToPlainText', () => {
  it('strips markdown syntax', () => {
    expect(
      markdownToPlainText(
        '## Summary\nYou spent **₹45,000** on `dining` — [details](/x).',
      ),
    ).toBe('Summary You spent ₹45,000 on dining — details.');
  });
});

describe('truncateForNotification', () => {
  it('returns short text unchanged', () => {
    expect(truncateForNotification('short')).toBe('short');
  });

  it('truncates long text with an ellipsis', () => {
    const result = truncateForNotification('a'.repeat(500));
    expect(result.length).toBeLessThanOrEqual(140);
    expect(result.endsWith('…')).toBe(true);
  });

  it('honors a custom max length', () => {
    const result = truncateForNotification('a'.repeat(50), 10);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result.endsWith('…')).toBe(true);
  });
});

describe('isPageVisible', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is true only when the document is visible and focused', () => {
    stubVisibility(true, true);
    expect(isPageVisible()).toBe(true);
  });

  it('is false when the tab is hidden', () => {
    stubVisibility(false);
    expect(isPageVisible()).toBe(false);
  });

  it('is false when the tab is visible but the window is unfocused', () => {
    stubVisibility(true, false);
    expect(isPageVisible()).toBe(false);
  });
});

describe('ensureNotificationPermission', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requests permission when it is still undecided', () => {
    const { requestPermission } = installMockNotification('default');
    ensureNotificationPermission();
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('does not re-prompt when permission is already granted or denied', () => {
    for (const permission of ['granted', 'denied'] as const) {
      const { requestPermission } = installMockNotification(permission);
      ensureNotificationPermission();
      expect(requestPermission).not.toHaveBeenCalled();
    }
  });
});

describe('showBrowserNotification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows a notification with the given options when permission granted', () => {
    const { instances } = installMockNotification('granted');
    showBrowserNotification({ title: 'Hi', body: 'There', tag: 'my-tag' });
    expect(instances).toHaveLength(1);
    expect(instances[0].title).toBe('Hi');
    expect(instances[0].options?.body).toBe('There');
    expect(instances[0].options?.tag).toBe('my-tag');
  });

  it('does nothing without granted permission', () => {
    const { instances } = installMockNotification('denied');
    showBrowserNotification({ title: 'Hi' });
    expect(instances).toHaveLength(0);
  });

  it('shows even while the page is visible', () => {
    stubVisibility(true, true);
    const { instances } = installMockNotification('granted');
    showBrowserNotification({ title: 'Hi' });
    expect(instances).toHaveLength(1);
  });

  it('focuses the window and runs onClick when clicked', () => {
    const { instances } = installMockNotification('granted');
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => undefined);
    const onClick = vi.fn();
    showBrowserNotification({ title: 'Hi', onClick });
    instances[0].onclick?.();
    expect(focus).toHaveBeenCalled();
    expect(instances[0].close).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalled();
  });
});

describe('notifyWhenAway', () => {
  beforeEach(() => {
    stubVisibility(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows a notification when the page is hidden', () => {
    const { instances } = installMockNotification('granted');
    notifyWhenAway({ title: 'Done' });
    expect(instances).toHaveLength(1);
  });

  it('does nothing while the user is looking at the page', () => {
    vi.restoreAllMocks();
    stubVisibility(true, true);
    const { instances } = installMockNotification('granted');
    notifyWhenAway({ title: 'Done' });
    expect(instances).toHaveLength(0);
  });

  it('shows a notification when the tab is visible but the window is unfocused', () => {
    vi.restoreAllMocks();
    stubVisibility(true, false);
    const { instances } = installMockNotification('granted');
    notifyWhenAway({ title: 'Done' });
    expect(instances).toHaveLength(1);
  });
});
