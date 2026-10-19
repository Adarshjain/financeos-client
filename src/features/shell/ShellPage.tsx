import Link from 'next/link';
import React from 'react';

import { TopBar, type TopBarAction } from '@/components/ds';
import { Logo } from '@/components/organisms';

/**
 * Top-bar actions every /ds page gets (boards D-accounts, P-accounts), matching the live routes.
 * Search is left out: the live app has no global search to match.
 */
export const shellTopBarActions: TopBarAction[] = [
  {
    id: 'chat',
    icon: 'chat',
    label: 'Ask the data',
    asChild: true,
    children: <Link href="/chat" />,
  },
  {
    id: 'notifications',
    icon: 'notifications',
    label: 'Notifications',
    asChild: true,
    children: <Link href="/settings/activity" />,
  },
];

export interface ShellPageProps {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  /** Where the + goes. Without it the bar has no add action. */
  addHref?: string;
  addLabel?: string;
  /** Where the phone back button goes (detail pages). Replaces the leading logo on phone; without it the bar shows the logo. */
  backHref?: string;
  children: React.ReactNode;
}

/** One signed-in page: the top bar with this page's title and +, then the content area. */
export function ShellPage({
  title,
  crumb,
  addHref,
  addLabel,
  backHref,
  children,
}: ShellPageProps) {
  return (
    <>
      <TopBar
        title={title}
        crumb={crumb}
        leading={backHref ? undefined : <Logo variant="mark" />}
        backHref={backHref}
        actions={[
          ...shellTopBarActions,
          ...(addHref
            ? [
                {
                  id: 'add',
                  icon: 'add' as const,
                  label: addLabel ?? 'Add',
                  variant: 'primary' as const,
                  showLabel: true,
                  asChild: true,
                  children: <Link href={addHref} />,
                },
              ]
            : []),
        ]}
      />
      <main className="flex-1 p-space-16 desk:p-space-24 pb-bottom-clearance desk:pb-space-24">
        {children}
      </main>
    </>
  );
}
