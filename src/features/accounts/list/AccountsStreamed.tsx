import React, { Suspense } from 'react';

import { Conceal } from '@/components/ds/Conceal/Conceal';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { RetirementCard } from '@/features/investments/retirement/RetirementCard';
import { retirementExcludesNote, retirementNetWorthTotal } from '@/features/investments/retirement/retirementModel';
import { LoansCard } from '@/features/loans/list/LoansCard';
import { LoadError } from '@/features/shell/LoadError';
import type { CreditCard } from '@/lib/account.types';
import type { CardBillResponse } from '@/lib/api/types';

import type { AccountsListData } from './accountsListData';
import {
  type AccountSections,
  type CardBaseRow,
  cardsSubtitle,
  investmentsKpi,
  netWorthKpi,
  nextBillBadge,
  rewardsText,
  type RewardTotal,
  unpaidBillsDue,
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

/** The Investments figure: the brokers plus EPF and the holder's own NPS. If retirement could not be read it shows the brokers alone. */
export async function InvestmentsValue({
  sections,
  retirement,
}: Pick<AccountsListData, 'retirement'> & { sections: AccountSections }) {
  const result = await retirement;
  return <Conceal>{investmentsKpi(sections, null, result.ok ? retirementNetWorthTotal(result.data) : 0).value}</Conceal>;
}

/** The Retirement card, the same one Investments › Retirement shows. */
export async function RetirementSection({ retirement }: Pick<AccountsListData, 'retirement'>) {
  const result = await retirement;
  if (!result.ok) return <LoadError what="retirement" reference={result.reference} />;
  return <RetirementCard model={result.data} />;
}

/** The Loans card. */
export async function LoansSection({ loans }: Pick<AccountsListData, 'loans'>) {
  const data = await loans;
  if (!data) return <LoadError what="loans" />;
  return <LoansCard rows={data.rows} closedLine={data.closedLine} />;
}

export async function InvestmentsDelta({
  sections,
  dayChangePct,
  retirement,
}: Pick<AccountsListData, 'dayChangePct' | 'retirement'> & { sections: AccountSections }) {
  const delta = investmentsKpi(sections, await dayChangePct).delta;
  const retirementResult = await retirement;
  const note = retirementResult.ok ? retirementExcludesNote(retirementResult.data.failed) : "Excludes EPF and NPS — couldn't load";
  if (!delta && !note) return null;
  return (
    <>
      {delta ? (
        <>
          <span>{delta.value}</span> {delta.period}
        </>
      ) : null}
      {delta && note ? ' · ' : null}
      {note}
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

/** The Credit cards subtitle: leads with the unpaid bills once they load, and is today's text until then or if they failed. */
export async function CardsSubtitle({
  bills,
  open,
  today,
}: Pick<AccountsListData, 'bills'> & { open: readonly CreditCard[]; today: string }) {
  return <Conceal>{cardsSubtitle(open, unpaidBillsDue(await bills, open, today))}</Conceal>;
}
