/** The three tabs of Rewards, each a Dinero page under `/ds/rewards`. */
import { appHref } from '@/features/shell/routes';

export type RewardsTabId = 'overview' | 'which-card' | 'rules';

export interface RewardsTab {
  id: RewardsTabId;
  label: string;
  /** Path under the Rewards URL: '' for Overview. */
  segment: string;
}

export const rewardsTabs: RewardsTab[] = [
  { id: 'overview', label: 'Overview', segment: '' },
  { id: 'rules', label: 'Earning rules', segment: '/rules' },
  { id: 'which-card', label: 'Which card?', segment: '/which-card' },
];

/** The Overview URL. */
export const REWARDS_HREF = appHref('/rewards');

/** Where a tab goes. */
export function rewardsTabHref(tab: RewardsTab): string {
  return `${REWARDS_HREF}${tab.segment}`;
}

/** A card's own rewards page. */
export function rewardsCardHref(accountId: string): string {
  return `${REWARDS_HREF}/cards/${accountId}`;
}

/** The tab a pathname belongs to; anything that is not another tab is Overview. */
export function activeRewardsTab(pathname: string | null | undefined): RewardsTabId {
  const path = (pathname ?? '').replace(/\/+$/, '');
  const rest = path.startsWith(REWARDS_HREF) ? path.slice(REWARDS_HREF.length) : '';
  return rewardsTabs.find((t) => t.segment !== '' && rest === t.segment)?.id ?? 'overview';
}
