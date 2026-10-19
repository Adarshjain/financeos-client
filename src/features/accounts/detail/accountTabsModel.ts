import { AccountType } from '@/lib/types';

export type AccountTabId = 'overview' | 'statements' | 'cards' | 'rewards';

export interface AccountTabDef {
  id: AccountTabId;
  label: string;
  /** Path under the account URL: '' for Overview. */
  segment: string;
}

const OVERVIEW: AccountTabDef = { id: 'overview', label: 'Overview', segment: '' };
const STATEMENTS: AccountTabDef = { id: 'statements', label: 'Statements', segment: '/statements' };
const CARDS: AccountTabDef = { id: 'cards', label: 'Cards', segment: '/cards' };
const REWARDS: AccountTabDef = { id: 'rewards', label: 'Rewards', segment: '/rewards' };

/** The tabs an account type shows; brokers have only Overview, so no strip. */
export function accountTabsFor(type: AccountType): AccountTabDef[] {
  switch (type) {
    case AccountType.CREDIT_CARD:
    case AccountType.BANK_ACCOUNT:
      return [OVERVIEW, STATEMENTS, CARDS, REWARDS];
    case AccountType.GENERIC:
      return [OVERVIEW, REWARDS];
    default:
      return [];
  }
}

export function accountHref(accountId: string): string {
  return `/ds/accounts/${accountId}`;
}

/** The tab a pathname belongs to; anything under the account URL that is not another tab is Overview. */
export function activeTabId(pathname: string, accountId: string): AccountTabId {
  const base = accountHref(accountId);
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : '';
  for (const tab of [STATEMENTS, CARDS, REWARDS]) {
    if (rest === tab.segment || rest.startsWith(`${tab.segment}/`)) return tab.id;
  }
  return 'overview';
}

/** The count a tab shows once tab-counts has loaded; Overview and Rewards carry none. */
export function tabCount(
  id: AccountTabId,
  counts: { statements: number; cards: number } | undefined
): number | undefined {
  if (!counts) return undefined;
  if (id === 'statements') return counts.statements;
  if (id === 'cards') return counts.cards;
  return undefined;
}
