import { notFound } from 'next/navigation';

import { loadAccount } from '@/features/accounts/detail/accountData';
import { loadCardsData } from '@/features/accounts/detail/cards/cardsData';
import { buildCardsModel } from '@/features/accounts/detail/cards/cardsModel';
import { CardsTab } from '@/features/accounts/detail/cards/CardsTab';
import { todayInAppZone } from '@/lib/date-range';
import { AccountType } from '@/lib/types';

export default async function DsAccountCardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await loadAccount(id);
  if (!account) notFound();
  const isBank = account.type === AccountType.BANK_ACCOUNT;
  if (!isBank && account.type !== AccountType.CREDIT_CARD) notFound();

  const today = todayInAppZone();
  const { cardholders, stats } = await loadCardsData(account.id);
  const model = cardholders
    ? buildCardsModel({
        cardholders,
        stats,
        isBank,
        creditCard: account.type === AccountType.CREDIT_CARD ? account : null,
        today,
      })
    : null;

  return (
    <CardsTab
      accountId={account.id}
      accountName={account.name}
      isBank={isBank}
      today={today}
      cardholders={cardholders}
      stats={stats}
      model={model}
    />
  );
}
