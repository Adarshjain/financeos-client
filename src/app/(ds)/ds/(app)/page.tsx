import Link from 'next/link';
import React from 'react';

import { Card, ListRow, SectionHeader } from '@/components/ds';
import { ShellPage } from '@/features/shell/ShellPage';

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
          <ListRow asChild title="Home" subtitle="/ds/dashboard" chevron>
            <Link href="/ds/dashboard" />
          </ListRow>
          <ListRow asChild title="Dashboards" subtitle="/ds/dashboards" chevron>
            <Link href="/ds/dashboards" />
          </ListRow>
          {/* A dashboard's page needs a real id: open one from Dashboards. */}
          <ListRow asChild title="Dashboard" subtitle="/ds/dashboards/[id]" chevron>
            <Link href="/ds/dashboards" />
          </ListRow>
          <ListRow asChild title="New dashboard" subtitle="/ds/dashboards/new" chevron>
            <Link href="/ds/dashboards/new" />
          </ListRow>
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
          <ListRow asChild title="Tradebook" subtitle="/ds/investments/tradebook" chevron>
            <Link href="/ds/investments/tradebook" />
          </ListRow>
          <ListRow asChild title="Dividends" subtitle="/ds/investments/dividends" chevron>
            <Link href="/ds/investments/dividends" />
          </ListRow>
          <ListRow asChild title="F&O" subtitle="/ds/investments/fno" chevron>
            <Link href="/ds/investments/fno" />
          </ListRow>
          <ListRow asChild title="Corporate actions" subtitle="/ds/investments/corporate-actions" chevron>
            <Link href="/ds/investments/corporate-actions" />
          </ListRow>
          <ListRow asChild title="Instruments" subtitle="/ds/investments/instruments" chevron>
            <Link href="/ds/investments/instruments" />
          </ListRow>
          <ListRow asChild title="Import tradebook" subtitle="/ds/investments/import" chevron>
            <Link href="/ds/investments/import" />
          </ListRow>
          <ListRow asChild title="Rewards overview" subtitle="/ds/rewards" chevron>
            <Link href="/ds/rewards" />
          </ListRow>
          <ListRow asChild title="Which card?" subtitle="/ds/rewards/which-card" chevron>
            <Link href="/ds/rewards/which-card" />
          </ListRow>
          <ListRow asChild title="Reports" subtitle="/ds/reports" chevron>
            <Link href="/ds/reports" />
          </ListRow>
          <ListRow asChild title="New report" subtitle="/ds/reports/new" chevron>
            <Link href="/ds/reports/new" />
          </ListRow>
          {/* A report's page needs a real id: open one from Reports (breakdown and underlying data live there). */}
          <ListRow asChild title="Report" subtitle="/ds/reports/[id]" chevron>
            <Link href="/ds/reports" />
          </ListRow>
          <ListRow asChild title="Ask the data" subtitle="/ds/chat" chevron>
            <Link href="/ds/chat" />
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
      </div>
    </ShellPage>
  );
}
