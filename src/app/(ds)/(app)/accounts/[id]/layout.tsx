import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import React from 'react';

import { loadAccount } from '@/features/accounts/detail/accountData';
import { AccountShell } from '@/features/accounts/detail/AccountShell';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const account = await loadAccount((await params).id);
  return { title: account?.name ?? 'Account' };
}

export default async function DsAccountLayout({ children, params }: Params & { children: React.ReactNode }) {
  const account = await loadAccount((await params).id);
  // A missing account raises not-found above this layout (accounts/not-found.tsx, with its own bar); a tab the
  // account has none of raises it inside, under this layout's bar ([id]/not-found.tsx, framed).
  if (!account) notFound();
  return <AccountShell account={account}>{children}</AccountShell>;
}
