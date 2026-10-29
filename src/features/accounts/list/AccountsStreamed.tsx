import React, { Suspense } from 'react';

import { KpiTile, Skeleton, StatusWord, Text } from '@/components/ds';
import type { CardBillResponse } from '@/lib/api/types';

import type { AccountsListData } from './accountsListData';
import {
  type AccountSections,
  type CardBaseRow,
  investmentsKpi,
  netWorthKpi,
  nextBillBadge,
  rewardsText,
  type RewardTotal,
} from './accountsListModel';
import type { CardListRow } from './AccountsSections';

// Small async Server Components: each awaits one promise that the page already started, so the
// accounts render at once and these fill in as their data arrives. A failed request resolves to
// null and each piece then degrades exactly as before.

export async function NetWorthTile({
  netWorth,
}: Pick<AccountsListData, 'netWorth'>) {
  const value = await netWorth;
  if (value === null) {
    return <KpiTile label="Net worth" error="Couldn't load net worth. Try again." />;
  }
  const kpi = netWorthKpi(value);
  return <KpiTile label={kpi.label} value={kpi.value} />;
}

export async function InvestmentsTile({
  sections,
  dayChangePct,
}: Pick<AccountsListData, 'dayChangePct'> & { sections: AccountSections }) {
  const kpi = investmentsKpi(sections, await dayChangePct);
  return <KpiTile label={kpi.label} value={kpi.value} delta={kpi.delta} />;
}

/** The investments tile without its delta: the value comes from the accounts, so it shows at once. */
export function InvestmentsTileFallback({
  sections,
}: {
  sections: AccountSections;
}) {
  const kpi = investmentsKpi(sections, null);
  return <KpiTile label={kpi.label} value={kpi.value} />;
}

async function billFor(
  bills: AccountsListData['bills'],
  id: string
): Promise<CardBillResponse | undefined> {
  return ((await bills) ?? []).find((b) => b.accountId === id);
}

async function rewardFor(
  rewards: AccountsListData['rewards'],
  id: string
): Promise<RewardTotal | undefined> {
  return ((await rewards) ?? []).find((r) => r.accountId === id);
}

async function NextBill({
  bills,
  id,
  today,
}: Pick<AccountsListData, 'bills'> & { id: string; today: string }) {
  const badge = nextBillBadge(await billFor(bills, id), today);
  return badge ? <StatusWord tone={badge.tone}>{badge.label}</StatusWord> : null;
}

async function Rewards({
  rewards,
  id,
}: Pick<AccountsListData, 'rewards'> & { id: string }) {
  return <Text variant="body">{rewardsText(await rewardFor(rewards, id))}</Text>;
}

async function PhoneRewards({
  rewards,
  id,
  separator,
}: Pick<AccountsListData, 'rewards'> & { id: string; separator: boolean }) {
  const text = rewardsText(await rewardFor(rewards, id));
  if (text === '—') return null;
  return (
    <>
      {separator ? ' · ' : null}
      {text}
    </>
  );
}

/** A credit-card row whose bill and rewards cells stream in behind their own Suspense. */
export function streamedCardRow(
  base: CardBaseRow,
  streams: Pick<AccountsListData, 'bills' | 'rewards'>,
  today: string
): CardListRow {
  const { id } = base;
  const { bills, rewards } = streams;
  return {
    ...base,
    billSlot: (
      <Suspense key="bill" fallback={<Skeleton width={72} height={20} />}>
        <NextBill bills={bills} id={id} today={today} />
      </Suspense>
    ),
    rewardsSlot: (
      <Suspense key="rewards" fallback={<Skeleton width={56} height={14} />}>
        <Rewards rewards={rewards} id={id} />
      </Suspense>
    ),
    phoneRewardsSlot: (
      <Suspense key="phoneRewards" fallback={null}>
        <PhoneRewards
          rewards={rewards}
          id={id}
          separator={base.cardholders > 1 || base.limitUsed !== null}
        />
      </Suspense>
    ),
  };
}
