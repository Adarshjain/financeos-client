import { describe, expect, it } from 'vitest';

import { activeInboxTab, inboxTabs } from './inboxTabs';

describe('inboxTabs', () => {
  it('lists To do then Updates, both titled Inbox', () => {
    expect(inboxTabs.map((t) => [t.id, t.label, t.title, t.href])).toEqual([
      ['inbox', 'To do', 'Inbox', '/inbox'],
      ['updates', 'Updates', 'Inbox', '/inbox/updates'],
    ]);
  });

  it('picks the tab from the pathname', () => {
    expect(activeInboxTab('/inbox').id).toBe('inbox');
    expect(activeInboxTab('/inbox/updates').id).toBe('updates');
    expect(activeInboxTab('/inbox/updates/').id).toBe('updates');
    expect(activeInboxTab(null).id).toBe('inbox');
  });
});
