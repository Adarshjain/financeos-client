'use client';

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
    children: <Link href="/chat" prefetch={false} />,
  },
];

export interface ShellPageProps {
  title: React.ReactNode;
  crumb?: React.ReactNode;
  /** Where the + goes. Without it the bar has no add action. */
  addHref?: string;
  /** A same-page add: the + calls this (e.g. opens a dialog) instead of navigating. Wins over addHref. */
  onAdd?: () => void;
  addLabel?: string;
  /** Where the phone back button goes (detail pages). Replaces the leading logo on phone; without it the bar shows the logo. */
  backHref?: string;
  /** The content starts with a tab strip: no space between the top bar and it. */
  flushTop?: boolean;
  children: React.ReactNode;
}

/** One signed-in page: the top bar with this page's title and +, then the content area. */
export function ShellPage({
  title,
  crumb,
  addHref,
  onAdd,
  addLabel,
  backHref,
  flushTop,
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
          ...(onAdd
            ? [
                {
                  id: 'add',
                  icon: 'add' as const,
                  label: addLabel ?? 'Add',
                  variant: 'primary' as const,
                  showLabel: true,
                  labelIconSize: 'xs' as const,
                  onSelect: onAdd,
                },
              ]
            : addHref
            ? [
                {
                  id: 'add',
                  icon: 'add' as const,
                  label: addLabel ?? 'Add',
                  variant: 'primary' as const,
                  showLabel: true,
                  labelIconSize: 'xs' as const,
                  asChild: true,
                  children: <Link href={addHref} />,
                },
              ]
            : []),
        ]}
      />
      <main
        className={`flex-1 p-space-16 desk:p-space-24 pb-bottom-clearance desk:pb-space-24${flushTop ? ' pt-0 desk:pt-0' : ''}`}
      >
        {children}
      </main>
    </>
  );
}
