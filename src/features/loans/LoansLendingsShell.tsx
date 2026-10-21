'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { useAddLending } from '@/features/lendings/form/AddLendingProvider';
import { ShellPage } from '@/features/shell/ShellPage';

import { LoanFormDialog } from './form/LoanFormDialog';
import { activeLoansLendingsTab, isLoanDetailPath, isPersonDetailPath, loansLendingsTabs } from './loansLendingsTabs';
import { useLoansLendingsCounts } from './useLoansLendingsCounts';

/**
 * The frame shared by `/ds/loans` and `/ds/loans/lendings`, applied by the route layout: the top bar
 * (title follows the tab; its + adds a lending or a loan in place), then the Lendings · Loans route
 * tabs, then the tab's page. The counts load on their own after the page renders.
 */
export function LoansLendingsShell({ children }: { children: React.ReactNode }) {
  // A loan's or a person's own page has its own top bar: it renders on its own, without the tabs or their counts.
  const pathname = usePathname();
  if (isLoanDetailPath(pathname) || isPersonDetailPath(pathname)) return <>{children}</>;
  return <LoansLendingsFrame>{children}</LoansLendingsFrame>;
}

function LoansLendingsFrame({ children }: { children: React.ReactNode }) {
  const tab = activeLoansLendingsTab(usePathname());
  const { data: counts } = useLoansLendingsCounts();
  const addLending = useAddLending();
  const [addingLoan, setAddingLoan] = React.useState(false);

  const items: TabItem[] = loansLendingsTabs.map((t) => ({
    value: t.id,
    label: t.label,
    count: counts?.[t.id],
    asChild: true,
    children: <Link href={t.href} />,
  }));

  return (
    <>
      <ShellPage
        crumb="Owe & lend"
        title={tab.title}
        flushTop
        onAdd={tab.id === 'loans' ? () => setAddingLoan(true) : () => addLending.open()}
      >
        <div className="flex flex-col gap-space-12 desk:gap-space-16">
          <Tabs items={items} value={tab.id} />
          {children}
        </div>
      </ShellPage>
      {addingLoan ? <LoanFormDialog onClose={() => setAddingLoan(false)} /> : null}
    </>
  );
}
