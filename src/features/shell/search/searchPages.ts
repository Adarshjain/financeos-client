import type { IconName } from '@/components/ds/Icon/registry';
import { dataSourcesSections } from '@/features/data-sources/dataSourcesSections';
import { inboxTabs } from '@/features/inbox/inboxTabs';
import { HOLDINGS_HREF, INVESTMENTS_IMPORT_HREF, investmentsTabs } from '@/features/investments/investmentsTabs';
import { rewardsTabHref, rewardsTabs } from '@/features/rewards/overview/rewardsTabs';
import { settingsSections } from '@/features/settings/settingsSections';
import { TRANSACTION_TABS } from '@/features/transactions/transactionTabs';
import { upcomingTabs } from '@/features/upcoming/upcomingTabs';

import { shellFooterItems, shellQuickAddItems, shellRailGroups } from '../navigation';
import { appHref } from '../routes';
import type { SearchPage } from './searchItems';

/** The pages the palette finds: the rail and footer items, then every tab and section built from its own definition. */
export function searchPages(): SearchPage[] {
  const rail = [...shellRailGroups.flatMap((g) => g.items), ...shellFooterItems];
  const iconOf = (id: string): IconName => rail.find((i) => i.id === id)!.icon;
  const labelOf = (id: string): string => rail.find((i) => i.id === id)!.label;

  const pages: SearchPage[] = rail.map(({ id, label, icon, href }) => ({ id, label, icon, href }));
  const seen = new Set(pages.map((p) => appHref(p.href)));
  // A tab whose address is its page's own is covered by the page's row; `keep` adds it anyway when its name is one
  // people search for (Trades is the default view of Activity).
  const add = (area: string, id: string, label: string, href: string, context?: string, keep = false) => {
    const resolved = appHref(href);
    if (seen.has(resolved) && !keep) return;
    seen.add(resolved);
    pages.push({ id, label, icon: iconOf(area), href, context: [labelOf(area), context].filter(Boolean).join(' · ') });
  };

  add('accounts', 'loans', 'Loans', '/loans');
  for (const t of TRANSACTION_TABS) add('transactions', `transactions:${t.value}`, t.label, t.href);
  for (const t of upcomingTabs) add('upcoming', `upcoming:${t.id}`, t.label, t.href);
  for (const t of inboxTabs) add('inbox', `inbox:${t.id}`, t.label, t.href);
  for (const t of rewardsTabs) add('rewards', `rewards:${t.id}`, t.label, rewardsTabHref(t));
  add('investments', 'investments:stocks', 'Stocks & funds', HOLDINGS_HREF);
  for (const t of investmentsTabs) add('investments', `investments:${t.id}`, t.label, t.path, 'Stocks & funds');
  add('investments', 'investments:epf', 'EPF', '/investments/epf');
  add('investments', 'investments:nps', 'NPS', '/investments/nps');
  add('investments', 'instruments', 'Instruments', '/investments/instruments');
  add('investments', 'investments:import', 'Import tradebook', INVESTMENTS_IMPORT_HREF);
  for (const s of settingsSections) add('settings', `settings:${s.id}`, s.label, s.href);
  for (const s of dataSourcesSections) add('settings', `data-sources:${s.id}`, s.label, s.href, 'Data sources');
  const importAction = shellQuickAddItems.find((i) => i.id === 'import');
  // Import a file serves every area, so it gets the Quick add icon and no area context.
  if (importAction?.href && !seen.has(appHref(importAction.href))) {
    seen.add(appHref(importAction.href));
    pages.push({ id: 'import', label: 'Import a file', icon: importAction.icon, href: importAction.href });
  }
  return pages;
}
