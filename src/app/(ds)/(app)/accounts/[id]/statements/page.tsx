import { requireAccount } from '@/features/accounts/detail/accountRoute';
import { AccountStatements } from '@/features/accounts/detail/statements/AccountStatements';
import { parseStatementsUrl } from '@/features/accounts/detail/statements/statementsUrl';
import type { SearchParams } from '@/features/shell/searchParams';
import { todayInAppZone } from '@/lib/date-range';
import { AccountType } from '@/lib/types';

export default async function DsAccountStatementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const account = await requireAccount(
    (await params).id,
    (a) => a.type === AccountType.CREDIT_CARD || a.type === AccountType.BANK_ACCOUNT
  );
  return <AccountStatements account={account} params={parseStatementsUrl(await searchParams)} today={todayInAppZone()} />;
}
