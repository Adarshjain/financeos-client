import React, { Suspense } from 'react';

import { Conceal } from '@/components/ds/Conceal/Conceal';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
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

export async function NetWorthValue({ netWorth }: Pick<AccountsListData, 'netWorth'>) {
  const value = await netWorth;
  if (value === null) {
    return (
      <Text variant="body" tone="danger" as="span">
        Couldn&apos;t load net worth. Try again.
      </Text>
    );
  }
  const text = netWorthKpi(value).value;
  return value < 0 ? (
    <Text variant="hero-figure" family="display" tone="danger" as="span">
      <Conceal>{text}</Conceal>
    </Text>
  ) : (
    <Conceal>{text}</Conceal>
  );
}

export async function InvestmentsDelta({
  sections,
  dayChangePct,
}: Pick<AccountsListData, 'dayChangePct'> & { sections: AccountSections }) {
  const delta = investmentsKpi(sections, await dayChangePct).delta;
  if (!delta) return null;
  return (
    <>
      <span>{delta.value}</span> {delta.period}
    </>
  );
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
