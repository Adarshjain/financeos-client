import { notFound } from 'next/navigation';

import { loadAccount } from '@/features/accounts/detail/accountData';
import { AccountStatements } from '@/features/accounts/detail/statements/AccountStatements';
import { todayInAppZone } from '@/lib/date-range';
import { AccountType } from '@/lib/types';

export default async function DsAccountStatementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fy?: string; statement?: string }>;
}) {
  const { id } = await params;
  const account = await loadAccount(id);
  if (!account) notFound();
  if (account.type !== AccountType.CREDIT_CARD && account.type !== AccountType.BANK_ACCOUNT) notFound();
  const { fy, statement } = await searchParams;
  return <AccountStatements account={account} params={{ fy, statement }} today={todayInAppZone()} />;
}
