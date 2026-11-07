import { describe, expect, it } from 'vitest';

import { activeUpcomingTab, upcomingTabs } from './upcomingTabs';

describe('upcomingTabs', () => {
  it('lists List then Calendar, both titled Upcoming', () => {
    expect(upcomingTabs.map((t) => [t.id, t.label, t.title, t.href])).toEqual([
      ['list', 'List', 'Upcoming', '/upcoming'],
      ['calendar', 'Calendar', 'Upcoming', '/upcoming/calendar'],
    ]);
  });

  it('picks the tab from the pathname', () => {
    expect(activeUpcomingTab('/upcoming').id).toBe('list');
    expect(activeUpcomingTab('/upcoming/calendar').id).toBe('calendar');
    expect(activeUpcomingTab('/upcoming/calendar/').id).toBe('calendar');
    expect(activeUpcomingTab(null).id).toBe('list');
  });
});
