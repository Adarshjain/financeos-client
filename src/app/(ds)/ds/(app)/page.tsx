import Link from 'next/link';
import React from 'react';

import { Card, ListRow, SectionHeader } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

/** Boards in design-system/screens that have no /ds page yet: [page, area]. */
const TO_BUILD: [string, string][] = [
  ['Home', 'Home & dashboards'],
  ['Dashboards', 'Home & dashboards'],
  ['Dashboard view and editing', 'Home & dashboards'],
  ['New dashboard', 'Home & dashboards'],
  ['Add widget and widget settings', 'Home & dashboards'],
  ['Search', 'Home & dashboards'],
  ['Tradebook', 'Investments'],
  ['Record trade', 'Investments'],
  ['Import tradebook', 'Investments'],
  ['Dividends', 'Investments'],
  ['F&O', 'Investments'],
  ['Corporate actions', 'Investments'],
  ['Instruments', 'Investments'],
  ['Reports', 'Reports'],
  ['New report', 'Reports'],
  ['Report view and breakdown', 'Reports'],
  ['Underlying data', 'Reports'],
  ['Ask the data', 'Reports'],
  ['Rewards overview', 'Rewards'],
  ['Which card?', 'Rewards'],
  ['Earning rules', 'Rewards'],
  ['Milestones and caps', 'Rewards'],
];

export default function DsIndexPage() {
  return (
    <ShellPage title="New design">
      <div className="max-w-container-md mx-auto space-y-space-24">
        {/* Signed out pages */}
        <Card>
          <SectionHeader borderTop={false}>Signed out</SectionHeader>
          <ListRow asChild title="Sign in" subtitle="/ds/login" chevron>
            <Link href="/ds/login" />
          </ListRow>
          <ListRow asChild title="Sign up" subtitle="/ds/signup" chevron>
            <Link href="/ds/signup" />
          </ListRow>
          <ListRow asChild title="Offline" subtitle="/ds/offline" chevron>
            <Link href="/ds/offline" />
          </ListRow>
          <ListRow asChild title="Locked" subtitle="/ds/locked" chevron>
            <Link href="/ds/locked" />
          </ListRow>
        </Card>

        {/* Signed in section */}
        <Card>
          <SectionHeader borderTop={false}>Signed in</SectionHeader>
          <ListRow asChild title="Accounts" subtitle="/ds/accounts" chevron>
            <Link href="/ds/accounts" />
          </ListRow>
          <ListRow asChild title="Transactions" subtitle="/ds/transactions" chevron>
            <Link href="/ds/transactions" />
          </ListRow>
          <ListRow asChild title="Import" subtitle="/ds/transactions/import" chevron>
            <Link href="/ds/transactions/import" />
          </ListRow>
          <ListRow asChild title="Rules" subtitle="/ds/transactions/rules" chevron>
            <Link href="/ds/transactions/rules" />
          </ListRow>
          <ListRow asChild title="Categories" subtitle="/ds/transactions/categories" chevron>
            <Link href="/ds/transactions/categories" />
          </ListRow>
          <ListRow asChild title="Lendings" subtitle="/ds/loans/lendings" chevron>
            <Link href="/ds/loans/lendings" />
          </ListRow>
          <ListRow asChild title="Loans" subtitle="/ds/loans" chevron>
            <Link href="/ds/loans" />
          </ListRow>
          <ListRow asChild title="Holdings" subtitle="/ds/investments" chevron>
            <Link href="/ds/investments" />
          </ListRow>
          {/* A holding's page needs a real id: open one from Holdings. */}
          <ListRow asChild title="Holding detail" subtitle="/ds/investments/[instrumentId]" chevron>
            <Link href="/ds/investments" />
          </ListRow>
          <ListRow asChild title="Settings" subtitle="/ds/settings" chevron>
            <Link href="/ds/settings" />
          </ListRow>
          <ListRow asChild title="Inbox" subtitle="/ds/inbox" chevron>
            <Link href="/ds/inbox" />
          </ListRow>
          <ListRow asChild title="Upcoming" subtitle="/ds/upcoming" chevron>
            <Link href="/ds/upcoming" />
          </ListRow>
          <ListRow asChild title="Notifications" subtitle="/ds/notifications" chevron>
            <Link href="/ds/notifications" />
          </ListRow>
        </Card>

        {/* Pages still to build: no route yet, so no link */}
        <Card>
          <SectionHeader borderTop={false}>To build</SectionHeader>
          {TO_BUILD.map(([title, area]) => (
            <ListRow key={`${area} ${title}`} title={title} subtitle={area} />
          ))}
        </Card>
      </div>
    </ShellPage>
  );
}
