import { beforeEach, describe, expect, it } from 'vitest';

import { markReplace } from '@/lib/navigationIntent';

import { commitRoute, hasInAppHistory, replaceCurrentRoute, resetInAppNavigation } from './navigationStore';

beforeEach(() => resetInAppNavigation());

describe('replaceCurrentRoute', () => {
  it('rewrites the current entry, so the commit that follows adds no in-app history', () => {
    commitRoute('/chat');
    replaceCurrentRoute('/chat/c1');
    commitRoute('/chat/c1');
    expect(hasInAppHistory()).toBe(false);
  });

  it('keeps the entries behind it', () => {
    commitRoute('/reports');
    commitRoute('/chat');
    replaceCurrentRoute('/chat/c1');
    commitRoute('/chat/c1');
    expect(hasInAppHistory()).toBe(true);
  });

  it('does nothing before any route has committed', () => {
    replaceCurrentRoute('/chat/c1');
    expect(hasInAppHistory()).toBe(false);
  });
});

describe('router.replace onto another page', () => {
  it('takes the current entry: a direct landing then a replace leaves nothing in-app behind', () => {
    commitRoute('/loans/l5');
    markReplace('/loans');
    commitRoute('/loans');
    expect(hasInAppHistory()).toBe(false);
  });

  it('keeps the entries behind it', () => {
    commitRoute('/loans');
    commitRoute('/loans/l5');
    markReplace('/loans');
    commitRoute('/loans');
    expect(hasInAppHistory()).toBe(true);
  });

  it('applies only to the page it was marked for', () => {
    commitRoute('/loans/l5');
    markReplace('/loans');
    commitRoute('/inbox');
    expect(hasInAppHistory()).toBe(true);
    commitRoute('/loans');
    expect(hasInAppHistory()).toBe(true);
  });
});
