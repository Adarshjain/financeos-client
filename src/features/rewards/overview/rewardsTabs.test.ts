import { describe, expect, it } from 'vitest';

import { activeRewardsTab, REWARDS_HREF, rewardsCardHref, rewardsTabHref, rewardsTabs } from './rewardsTabs';

describe('rewardsTabs', () => {
  it('lists Overview, Earning rules and Which card? at their addresses', () => {
    expect(rewardsTabs.map((t) => [t.label, rewardsTabHref(t)])).toEqual([
      ['Overview', '/rewards'],
      ['Earning rules', '/rewards/rules'],
      ['Which card?', '/rewards/which-card'],
    ]);
  });
  it('knows the tab of a pathname; anything else is Overview', () => {
    expect(REWARDS_HREF).toBe('/rewards');
    expect(activeRewardsTab('/rewards')).toBe('overview');
    expect(activeRewardsTab('/rewards/')).toBe('overview');
    expect(activeRewardsTab('/rewards/which-card')).toBe('which-card');
    expect(activeRewardsTab('/rewards/rules')).toBe('rules');
    expect(activeRewardsTab('/rewards/cards/c1')).toBe('overview');
    expect(activeRewardsTab(null)).toBe('overview');
  });
  it('addresses a card page', () => {
    expect(rewardsCardHref('c1')).toBe('/rewards/cards/c1');
  });
});
