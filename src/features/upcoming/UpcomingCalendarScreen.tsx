'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Icon } from '@/components/ds/Icon/Icon';
import { MonthCalendar } from '@/components/ds/MonthCalendar/MonthCalendar';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { formatMonth } from '@/components/ds/utils/index';
import { MarkPaidDialog } from '@/features/bills/MarkPaidDialog';
import { SettleDialog } from '@/features/lendings/SettleDialog';
import { todayInAppZone } from '@/lib/date-range';
import { useObligations } from '@/lib/query/hooks/useObligations';
import { replaceUrl } from '@/lib/urlState';

import {
  CALENDAR_MAX_OFFSET,
  calendarSearch,
  chipLabel,
  chipTone,
  daySubtitle,
  dayTitle,
  defaultSelectedDay,
  groupByDate,
  itemsInMonth,
  monthOffset,
  monthsToCover,
  monthSummary,
  parseCalendarMonth,
  shiftMonth,
} from './calendarModel';
import type { ObligationItem } from './obligationsModel';
import { UpcomingRow } from './UpcomingRow';
import { UpcomingRowsSkeleton } from './UpcomingSkeleton';
import { useUrlState } from './useUrlState';

const monthTitle = (month: string) => formatMonth(`${month}-01`);

/**
 * The Calendar tab of /upcoming: one month of obligations as chips, the selected day's rows
 * below. The shown month lives in the URL (`?month=`, left out for the current month);
 * `?bill=<statementId>` selects that bill's day and outlines its row.
 */
export function UpcomingCalendarScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const billParam = searchParams.get('bill');
  const today = todayInAppZone();
  const [month, setMonth] = useUrlState(searchParams.toString(), (search) =>
    parseCalendarMonth(new URLSearchParams(search).get('month'), today),
  );
  const [picked, setPicked] = React.useState<string | null>(null);
  const [paying, setPaying] = React.useState<{ item: ObligationItem; open: boolean } | null>(null);
  const [settling, setSettling] = React.useState<{ item: ObligationItem; open: boolean } | null>(null);

  const { data, error, isFetched, isPending, refetch } = useObligations(monthsToCover(today, month));
  const items = React.useMemo(() => data ?? [], [data]);
  const byDay = React.useMemo(() => groupByDate(items), [items]);
  const monthItems = React.useMemo(() => itemsInMonth(items, month), [items, month]);
  const events = React.useMemo(
    () =>
      monthItems.map((item, idx) => ({
        id: `${item.type}-${item.statementId ?? item.loanId ?? item.counterpartyId ?? item.accountId}-${item.installmentSeq ?? idx}-${idx}`,
        date: item.date as string,
        label: chipLabel(item),
        tone: chipTone(item),
      })),
    [monthItems],
  );

  const selected = picked && picked.startsWith(month) ? picked : defaultSelectedDay(month, today, byDay);
  const dayItems = byDay.get(selected) ?? [];

  const offset = monthOffset(today, month);
  const goTo = (next: string) => {
    setMonth(next);
    const search = calendarSearch(window.location.search, next, today);
    replaceUrl(`${window.location.pathname}${search}`, { keepState: true });
  };

  // A bill opened from a notification: show its month, select its day, bring its row into view.
  const billHandled = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!billParam || !isFetched || billHandled.current === billParam) return;
    const bill = items.find((i) => i.statementId === billParam && i.date);
    if (!bill?.date) return;
    billHandled.current = billParam;
    const billMonth = bill.date.slice(0, 7);
    if (billMonth !== month && monthOffset(today, billMonth) >= 0 && monthOffset(today, billMonth) <= CALENDAR_MAX_OFFSET) {
      setMonth(billMonth);
    }
    setPicked(bill.date);
  }, [billParam, isFetched, items, month, today, setMonth]);

  React.useEffect(() => {
    if (!billParam || !isFetched) return;
    const el = document.querySelector(`[data-bill-row="${CSS.escape(billParam)}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [billParam, isFetched, selected]);

  const failed = Boolean(error) && !data;
  const retry = { label: 'Retry', onSelect: () => void refetch() };

  const rowProps = (item: ObligationItem) => ({
    item,
    highlighted: Boolean(billParam) && item.statementId === billParam,
    onMarkPaid: (i: ObligationItem) => setPaying({ item: i, open: true }),
    onSettle: (i: ObligationItem) => setSettling({ item: i, open: true }),
  });
  const rowKey = (item: ObligationItem, idx: number) =>
    `${item.type}-${item.statementId ?? item.loanId ?? item.counterpartyId ?? item.accountId}-${item.installmentSeq ?? idx}-${idx}`;

  let body: React.ReactNode;
  if (isPending && !failed) {
    body = (
      <>
        <Card title={monthTitle(month)} subtitle={<Skeleton width={120} height={12} />} />
        <UpcomingRowsSkeleton />
      </>
    );
  } else {
    body = (
      <>
        {error ? (
          <Banner tone="danger" action={retry}>
            Couldn&apos;t load upcoming items.
          </Banner>
        ) : null}
        <Card
          title={monthTitle(month)}
          subtitle={monthSummary(monthItems) || undefined}
          action={
              <div className="flex items-center gap-space-8">
                <Button
                  variant="secondary"
                  size="sm"
                  iconOnly
                  aria-label="Previous month"
                  disabled={offset <= 0}
                  onClick={() => goTo(shiftMonth(month, -1))}
                  icon={<Icon name="chevron-left" size="xs" />}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goTo(today.slice(0, 7))}
                >
                  Today
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  iconOnly
                  aria-label="Next month"
                  disabled={offset >= CALENDAR_MAX_OFFSET}
                  onClick={() => goTo(shiftMonth(month, 1))}
                  icon={<Icon name="chevron-right" size="xs" />}
                />
              </div>
          }
        >
          <MonthCalendar
            mode="events"
            today={today}
            month={`${month}-01`}
            value={selected}
            onValueChange={(v) => typeof v === 'string' && setPicked(v)}
            events={events}
          />
        </Card>
        {failed ? null : (
          <Card title={dayTitle(selected)} subtitle={dayItems.length > 0 ? daySubtitle(dayItems) : undefined}>
            {dayItems.length === 0 ? (
              <Card.Empty>Nothing due on this day.</Card.Empty>
            ) : (
              dayItems.map((item, idx) => <UpcomingRow key={rowKey(item, idx)} {...rowProps(item)} />)
            )}
          </Card>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {body}
      {paying?.item.statementId ? (
        <MarkPaidDialog
          open={paying.open}
          onOpenChange={(open) => setPaying((p) => (p ? { ...p, open } : p))}
          statementId={paying.item.statementId}
          cardName={paying.item.accountName ?? paying.item.title ?? 'Card'}
          remaining={paying.item.amount ?? null}
        />
      ) : null}
      {settling?.item.counterpartyId ? (
        <SettleDialog
          open={settling.open}
          onOpenChange={(open) => setSettling((s) => (s ? { ...s, open } : s))}
          counterpartyId={settling.item.counterpartyId}
          name={settling.item.counterpartyName ?? ''}
          direction={settling.item.direction === 'borrowed' ? 'borrowed' : 'lent'}
          balance={settling.item.amount ?? 0}
          onRecorded={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
