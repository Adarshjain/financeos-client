import { requireAccount } from '@/features/accounts/detail/accountRoute';
import { loadCardsData } from '@/features/accounts/detail/cards/cardsData';
import { CardsTab } from '@/features/accounts/detail/cards/CardsTab';
import { todayInAppZone } from '@/lib/date-range';
import { AccountType } from '@/lib/types';

export default async function DsAccountCardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await requireAccount(
    (await params).id,
    (a) => a.type === AccountType.BANK_ACCOUNT || a.type === AccountType.CREDIT_CARD
  );
  const isBank = account.type === AccountType.BANK_ACCOUNT;

  const today = todayInAppZone();
  const { cardholders, stats, model } = await loadCardsData(account, today);

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
