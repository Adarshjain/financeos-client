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
          <ListRow asChild title="Sign in" subtitle="/login" chevron>
            <Link href="/login" />
          </ListRow>
          <ListRow asChild title="Sign up" subtitle="/signup" chevron>
            <Link href="/signup" />
          </ListRow>
          <ListRow asChild title="Offline" subtitle="/offline" chevron>
            <Link href="/offline" />
          </ListRow>
          <ListRow asChild title="Locked" subtitle="/locked" chevron>
            <Link href="/locked" />
          </ListRow>
        </Card>

        {/* Signed in section */}
        <Card>
          <SectionHeader borderTop={false}>Signed in</SectionHeader>
          <ListRow asChild title="Home" subtitle="/dashboard" chevron>
            <Link href="/dashboard" />
          </ListRow>
          <ListRow asChild title="Dashboards" subtitle="/dashboards" chevron>
            <Link href="/dashboards" />
          </ListRow>
          {/* A dashboard's page needs a real id: open one from Dashboards. */}
          <ListRow asChild title="Dashboard" subtitle="/dashboards/[id]" chevron>
            <Link href="/dashboards" />
          </ListRow>
          <ListRow asChild title="New dashboard" subtitle="/dashboards/new" chevron>
            <Link href="/dashboards/new" />
          </ListRow>
          <ListRow asChild title="Accounts" subtitle="/accounts" chevron>
            <Link href="/accounts" />
          </ListRow>
          <ListRow asChild title="Transactions" subtitle="/transactions" chevron>
            <Link href="/transactions" />
          </ListRow>
          <ListRow asChild title="Import" subtitle="/transactions/import" chevron>
            <Link href="/transactions/import" />
          </ListRow>
          <ListRow asChild title="Rules" subtitle="/transactions/rules" chevron>
            <Link href="/transactions/rules" />
          </ListRow>
          <ListRow asChild title="Categories" subtitle="/transactions/categories" chevron>
            <Link href="/transactions/categories" />
          </ListRow>
          <ListRow asChild title="Lendings" subtitle="/loans/lendings" chevron>
            <Link href="/loans/lendings" />
          </ListRow>
          <ListRow asChild title="Loans" subtitle="/loans" chevron>
            <Link href="/loans" />
          </ListRow>
          <ListRow asChild title="Holdings" subtitle="/investments" chevron>
            <Link href="/investments" />
          </ListRow>
          {/* A holding's page needs a real id: open one from Holdings. */}
          <ListRow asChild title="Holding detail" subtitle="/investments/[instrumentId]" chevron>
            <Link href="/investments" />
          </ListRow>
          <ListRow asChild title="Tradebook" subtitle="/investments/tradebook" chevron>
            <Link href="/investments/tradebook" />
          </ListRow>
          <ListRow asChild title="Dividends" subtitle="/investments/dividends" chevron>
            <Link href="/investments/dividends" />
          </ListRow>
          <ListRow asChild title="F&O" subtitle="/investments/fno" chevron>
            <Link href="/investments/fno" />
          </ListRow>
          <ListRow asChild title="Corporate actions" subtitle="/investments/corporate-actions" chevron>
            <Link href="/investments/corporate-actions" />
          </ListRow>
          <ListRow asChild title="Instruments" subtitle="/investments/instruments" chevron>
            <Link href="/investments/instruments" />
          </ListRow>
          <ListRow asChild title="Import tradebook" subtitle="/investments/import" chevron>
            <Link href="/investments/import" />
          </ListRow>
          <ListRow asChild title="Rewards overview" subtitle="/rewards" chevron>
            <Link href="/rewards" />
          </ListRow>
          <ListRow asChild title="Which card?" subtitle="/rewards/which-card" chevron>
            <Link href="/rewards/which-card" />
          </ListRow>
          <ListRow asChild title="Reports" subtitle="/reports" chevron>
            <Link href="/reports" />
          </ListRow>
          <ListRow asChild title="New report" subtitle="/reports/new" chevron>
            <Link href="/reports/new" />
          </ListRow>
          {/* A report's page needs a real id: open one from Reports (breakdown and underlying data live there). */}
          <ListRow asChild title="Report" subtitle="/reports/[id]" chevron>
            <Link href="/reports" />
          </ListRow>
          <ListRow asChild title="Ask the data" subtitle="/chat" chevron>
            <Link href="/chat" />
          </ListRow>
          <ListRow asChild title="Settings" subtitle="/settings" chevron>
            <Link href="/settings" />
          </ListRow>
          <ListRow asChild title="Inbox" subtitle="/inbox" chevron>
            <Link href="/inbox" />
          </ListRow>
          <ListRow asChild title="Upcoming" subtitle="/upcoming" chevron>
            <Link href="/upcoming" />
          </ListRow>
          <ListRow asChild title="Notifications" subtitle="/notifications" chevron>
            <Link href="/notifications" />
          </ListRow>
        </Card>
      </div>
    </ShellPage>
  );
}
