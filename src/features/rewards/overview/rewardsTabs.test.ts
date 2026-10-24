import { describe, expect, it } from 'vitest';

import { activeRewardsTab, REWARDS_HREF, rewardsCardHref, rewardsTabHref, rewardsTabs } from './rewardsTabs';

describe('rewardsTabs', () => {
  it('lists Overview, Which card? and Earning rules at their addresses', () => {
    expect(rewardsTabs.map((t) => [t.label, rewardsTabHref(t)])).toEqual([
      ['Overview', '/ds/rewards'],
      ['Which card?', '/ds/rewards/which-card'],
      ['Earning rules', '/ds/rewards/rules'],
    ]);
  });
  it('knows the tab of a pathname; anything else is Overview', () => {
    expect(REWARDS_HREF).toBe('/ds/rewards');
    expect(activeRewardsTab('/ds/rewards')).toBe('overview');
    expect(activeRewardsTab('/ds/rewards/')).toBe('overview');
    expect(activeRewardsTab('/ds/rewards/which-card')).toBe('which-card');
    expect(activeRewardsTab('/ds/rewards/rules')).toBe('rules');
    expect(activeRewardsTab('/ds/rewards/cards/c1')).toBe('overview');
    expect(activeRewardsTab(null)).toBe('overview');
  });
  it('addresses a card page', () => {
    expect(rewardsCardHref('c1')).toBe('/ds/rewards/cards/c1');
  });
});
