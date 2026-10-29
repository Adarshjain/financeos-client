import Link from 'next/link';
import React from 'react';

import {
  Button,
  GRID_GAP,
  Hero,
} from '@/components/ds';
import { currentMilestones } from '@/features/accounts/detail/milestonesModel';
import { LoadError } from '@/features/shell/LoadError';
import { appHref } from '@/features/shell/routes';

import { accountHref } from '../accountTabsModel';
import { EarningLines } from './EarningLines';
import { RewardsBanners } from './RewardsBanners';
import type { RewardsTabData } from './rewardsData';
import {
  buildKpis,
  buildMilestone,
  cardholderRows,
  completedMilestones,
  lineRow,
  linesSubtitle,
  rewardsBanners,
  ruleChips,
  ruleExtras,
  ruleLines,
} from './rewardsModel';
import { RewardsPeriodControl } from './RewardsPeriodControl';
import { capitalize, periodWords } from './rewardsPeriodModel';
import { CardholdersCard, MilestonesCard, RulesCard } from './RewardsSections';
import { RewardsEmpty } from './RewardsStates';

/**
 * The Rewards tab (boards D-account-rewards, D-account-rewards-empty): period, banners, hero, earning lines,
 * milestones and rules. One component for Accounts → card → Rewards and for the Rewards card page; `basePath` is
 * the page's own URL, which every address change (period, rule chip, pager) is made on.
 */
export function RewardsTab({
  account,
  today,
  data,
  basePath = `${accountHref(account.id)}/rewards`,
}: {
  account: { id: string; name: string };
  today: string;
  data: RewardsTabData;
  basePath?: string;
}) {
  const { report, rules, lines, window, query } = data;
  if (!report) {
    // The period stays on screen, so a range that fails can be changed.
    return (
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <RewardsPeriodControl basePath={basePath} query={query} window={window} today={today} />
        <LoadError what="rewards" />
      </div>
    );
  }
  if (report.rules.length === 0 && (rules?.length ?? 0) === 0 && report.milestones.length === 0) {
    return <RewardsEmpty accountId={account.id} accountName={account.name} />;
  }

  const preset = query.period;
  const kpis = buildKpis(report);
  const gross = kpis.find((k) => k.key === 'gross') ?? kpis[0];
  const ruleRows = ruleLines(rules, report);
  const extras = Object.fromEntries(ruleRows.map((r) => [r.id, ruleExtras(r.id, rules, report)]));
  const completed = completedMilestones(report.milestones);
  const holders = cardholderRows(report);
  const words = periodWords(preset, window);
  const pending = currentMilestones(report.milestones, today).filter((m) => !m.achieved);
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <RewardsPeriodControl basePath={basePath} query={query} window={window} today={today} />
      <RewardsBanners accountId={account.id} banners={rewardsBanners(report)} />
      <Hero
        label="Earned"
        value={gross.value}
        change={
          gross.context || gross.needsPointValue
            ? {
                text: (
                  <>
                    {gross.context}
                    {gross.needsPointValue ? (
                      <>
                        {gross.context ? ' · ' : ''}
                        <Button asChild variant="link" size="sm">
                          <Link href={appHref(`/rewards/rules?account=${account.id}`)}>Set point value</Link>
                        </Button>
                      </>
                    ) : null}
                  </>
                ),
              }
            : undefined
        }
        figures={kpis.filter((k) => k.key !== 'gross').map((k) => ({ label: k.label, value: k.value, tone: k.tone, caption: k.context }))}
      />
      <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
        <div className="desk:col-span-7 min-w-0">
          {lines ? (
            <EarningLines
              basePath={basePath}
              subtitle={linesSubtitle(lines.totalElements, window, preset)}
              rows={lines.content.map(lineRow)}
              total={lines.totalElements}
              chips={ruleChips(rules, report)}
              query={query}
            />
          ) : (
            <LoadError what="earning lines" />
          )}
        </div>
        <div className="desk:col-span-5 min-w-0 flex flex-col gap-space-8 desk:gap-space-16">
          {pending.length > 0 || completed ? (
            <MilestonesCard
              items={pending.map((m) => ({ key: `${m.milestoneId}:${m.windowStart}`, model: buildMilestone(m, today) }))}
              completed={completed}
            />
          ) : null}
          {ruleRows.length > 0 ? <RulesCard accountId={account.id} rules={ruleRows} extras={extras} all={rules} /> : null}
          {holders.length > 0 ? (
            <CardholdersCard rows={holders} subtitle={capitalize(words)} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
