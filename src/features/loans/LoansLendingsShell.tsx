'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { useAddLending } from '@/features/lendings/form/AddLendingProvider';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { LoanFormDialog } from './form/LoanFormDialog';
import { activeLoansLendingsTab, loansLendingsTabs } from './loansLendingsTabs';

/**
 * The frame shared by `/loans` and `/loans/lendings`, applied by the route layout: the top bar
 * (title follows the tab; its + adds a lending or a loan in place), then the Lendings · Loans route
 * tabs, then the tab's page.
 */
export function LoansLendingsShell({ children }: { children: React.ReactNode }) {
  const tab = activeLoansLendingsTab(usePathname());
  const addLending = useAddLending();
  const [addingLoan, setAddingLoan] = React.useState(false);

  const items: TabItem[] = loansLendingsTabs.map((t) => ({
    value: t.id,
    label: t.label,
    asChild: true,
    children: <Link href={t.href} />,
  }));

  return (
    <>
      <ShellPage
        crumb={areaCrumb('loans')}
        title={tab.title}
        addLabel={tab.id === 'loans' ? 'Add loan' : 'Add lending'}
        flushTop
        onAdd={tab.id === 'loans' ? () => setAddingLoan(true) : () => addLending.open()}
      >
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
          <Tabs items={items} value={tab.id} />
          {children}
        </div>
      </ShellPage>
      {addingLoan ? <LoanFormDialog onClose={() => setAddingLoan(false)} /> : null}
    </>
  );
}
