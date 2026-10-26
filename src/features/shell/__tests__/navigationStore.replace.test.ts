import { beforeEach, describe, expect, it } from 'vitest';

import { commitRoute, hasInAppHistory, replaceCurrentRoute, resetInAppNavigation } from '../navigationStore';

beforeEach(() => resetInAppNavigation());

describe('replaceCurrentRoute', () => {
  it('rewrites the current entry, so the commit that follows adds no in-app history', () => {
    commitRoute('/ds/chat');
    replaceCurrentRoute('/ds/chat/c1');
    commitRoute('/ds/chat/c1');
    expect(hasInAppHistory()).toBe(false);
  });

  it('keeps the entries behind it', () => {
    commitRoute('/ds/reports');
    commitRoute('/ds/chat');
    replaceCurrentRoute('/ds/chat/c1');
    commitRoute('/ds/chat/c1');
    expect(hasInAppHistory()).toBe(true);
  });

  it('does nothing before any route has committed', () => {
    replaceCurrentRoute('/ds/chat/c1');
    expect(hasInAppHistory()).toBe(false);
  });
});
