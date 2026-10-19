import React from 'react';

import { KpiTile } from '@/components/ds';

import { accountHref } from '../accountTabsModel';
import { currentMilestones } from '../milestones';
import { EarningLines } from './EarningLines';
import type { RewardsTabData } from './rewardsData';
import {
  buildKpis,
  buildMilestone,
  lineRow,
  linesSubtitle,
  ruleChips,
  ruleLines,
} from './rewardsModel';
import { MilestoneCard, RulesCard } from './RewardsSections';
import { RewardsEmpty, RewardsLoadError } from './RewardsStates';

/** The Rewards tab (boards D-account-rewards, D-account-rewards-empty): KPI tiles, earning lines, milestones and rules. */
export function RewardsTab({
  account,
  today,
  data,
}: {
  account: { id: string; name: string };
  today: string;
  data: RewardsTabData;
}) {
  const { report, rules, lines, window, query } = data;
  if (!report) return <RewardsLoadError what="rewards" />;
  if (report.rules.length === 0 && (rules?.length ?? 0) === 0 && report.milestones.length === 0) {
    return <RewardsEmpty accountId={account.id} accountName={account.name} />;
  }

  const kpis = buildKpis(report, window);
  const ruleRows = ruleLines(rules, report);
  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <div className="grid grid-cols-2 desk:grid-cols-4 gap-space-12 desk:gap-space-16">
        {kpis.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} context={k.context} />
        ))}
      </div>
      <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-space-12 desk:gap-space-16">
        <div className="desk:col-span-7 min-w-0">
          {lines ? (
            <EarningLines
              basePath={`${accountHref(account.id)}/rewards`}
              subtitle={linesSubtitle(lines.totalElements, window)}
              rows={lines.content.map(lineRow)}
              total={lines.totalElements}
              chips={ruleChips(rules, report)}
              query={query}
            />
          ) : (
            <RewardsLoadError what="earning lines" />
          )}
        </div>
        <div className="desk:col-span-5 min-w-0 flex flex-col gap-space-12 desk:gap-space-16">
          {currentMilestones(report.milestones, today).map((m) => (
            <MilestoneCard key={`${m.milestoneId}:${m.windowStart}`} model={buildMilestone(m, today)} />
          ))}
          {ruleRows.length > 0 ? (
            <RulesCard accountId={account.id} rules={ruleRows} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
