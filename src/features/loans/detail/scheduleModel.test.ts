import { describe, expect, it } from 'vitest';

import { fyGroupKey,fyLabel, fyStartYear } from './financialYearModel';
import { eventFixture, installment, loanFixture, scheduleFixture, TODAY } from './loanDetail.fixtures';
import {
  buildScheduleRows,
  fyOptions,
  fySplits,
  fySummary,
  fySummaryLine,
  initialFy,
  scheduleStatus,
} from './scheduleModel';

describe('financial years', () => {
  it('starts in April', () => {
    expect(fyStartYear('2026-03-31')).toBe(2025);
    expect(fyStartYear('2026-04-01')).toBe(2026);
    expect(fyStartYear('2026-12-05')).toBe(2026);
  });

  it('labels the Dinero way and the Legacy way', () => {
    expect(fyLabel(2026)).toBe('FY 26-27');
    expect(fyLabel(2099)).toBe('FY 99-00');
    expect(fyGroupKey('2026-10-05')).toBe('FY 2026-27');
    expect(fyGroupKey('2027-02-05')).toBe('FY 2026-27');
  });
});

describe('scheduleStatus', () => {
  const emi = (status: 'settled' | 'overdue' | 'upcoming', dueDate: string) => installment(1, dueDate, { status });

  it('says Paid for a settled EMI', () => {
    expect(scheduleStatus(emi('settled', '2026-09-05'), TODAY)).toEqual({ label: 'Paid', tone: 'success' });
  });

  it('counts the days an overdue EMI is late', () => {
    expect(scheduleStatus(emi('overdue', '2026-10-05'), '2026-10-13')).toEqual({ label: 'Overdue 8 d', tone: 'danger' });
    expect(scheduleStatus(emi('overdue', '2026-10-12'), '2026-10-13').label).toBe('Overdue 1 d');
  });

  it('counts the days to an EMI due within a month, then just says Upcoming', () => {
    expect(scheduleStatus(emi('upcoming', '2026-11-05'), '2026-10-13')).toEqual({ label: 'In 23 d', tone: 'neutral' });
    expect(scheduleStatus(emi('upcoming', '2026-11-12'), '2026-10-13').label).toBe('In 30 d');
    expect(scheduleStatus(emi('upcoming', '2026-11-13'), '2026-10-13').label).toBe('Upcoming');
    expect(scheduleStatus(emi('upcoming', '2026-12-05'), '2026-10-13').label).toBe('Upcoming');
  });

  it('says Due today on the day', () => {
    expect(scheduleStatus(emi('upcoming', '2026-10-13'), '2026-10-13').label).toBe('Due today');
  });
});

describe('financial-year selection', () => {
  const schedule = scheduleFixture();

  it('lists each year the schedule touches, oldest first', () => {
    expect(fyOptions(schedule)).toEqual([
      { value: '2026', label: 'FY 26-27' },
      { value: '2027', label: 'FY 27-28' },
    ]);
  });

  it('opens on the current year', () => {
    expect(initialFy(schedule, '2026-10-13', null)).toBe('2026');
  });

  it('opens on the year of ?installment=N, whatever today is', () => {
    const wide = [...schedule, installment(24, '2027-05-05'), installment(36, '2028-05-05')];
    expect(initialFy(wide, '2026-10-13', 36)).toBe('2028');
    expect(initialFy(wide, '2026-10-13', 24)).toBe('2027');
  });

  it('ignores an installment the schedule does not have', () => {
    expect(initialFy(schedule, '2026-10-13', 99)).toBe('2026');
  });

  it('takes the nearest year when today is outside the schedule', () => {
    const wide = [installment(1, '2024-05-05'), installment(2, '2027-05-05')];
    expect(initialFy(wide, '2026-10-13', null)).toBe('2027');
    expect(initialFy(wide, '2024-01-01', null)).toBe('2024');
  });

  it('has no year for an empty schedule', () => {
    expect(initialFy([], TODAY, 3)).toBeNull();
    expect(fyOptions([])).toEqual([]);
  });

  it('sums the year: EMIs, principal and interest', () => {
    expect(fySummary(schedule, '2026')).toEqual({ emis: 6, principal: 6 * 7728, interest: 6 * 28875 });
    expect(fySummaryLine(schedule, '2026')).toBe('6 EMIs · principal ₹46,368');
    expect(fySummaryLine([installment(1, '2026-05-05')], '2026')).toContain('1 EMI ·');
  });
});

describe('buildScheduleRows', () => {
  it('draws the board row: due day, plain figures, status and the phone line', () => {
    const rows = buildScheduleRows(loanFixture(), scheduleFixture(), [], '2026-10-13');
    const overdue = rows.find((r) => r.seq === 14)!;
    expect(overdue).toMatchObject({
      due: '5 Oct',
      opening: '42,00,055.00',
      emi: '36,603.00',
      interest: '28,875.00',
      principal: '7,728.00',
      closing: '41,92,327.00',
      status: { label: 'Overdue 8 d', tone: 'danger' },
      overdue: true,
      settled: false,
      payment: null,
      phoneSub: 'interest 28,875.00 · principal 7,728.00',
      fy: '2026',
    });
    expect(rows.find((r) => r.seq === 13)).toMatchObject({ settled: true, payment: { id: 'p13' } });
  });

  it('puts a prepayment above the first EMI due on or after it, with what it did', () => {
    const rows = buildScheduleRows(
      loanFixture(),
      scheduleFixture(),
      [eventFixture({ id: 'e1', effectiveDate: '2026-07-20' })],
      TODAY,
    );
    expect(rows.find((r) => r.seq === 12)?.band).toEqual({ key: 'e1', label: '20 Jul · Prepayment ₹2,00,000 · tenure reduced' });
    expect(rows.filter((r) => r.band)).toHaveLength(1);
  });

  it('reads a rate change against the rate before it and says how the EMI moved', () => {
    const rows = buildScheduleRows(
      loanFixture(),
      scheduleFixture(),
      [
        eventFixture({
          id: 'e2',
          eventType: 'rate_change',
          effectiveDate: '2026-08-01',
          amount: null,
          newAnnualRatePct: 8.25,
          adjustmentMode: 'reduce_emi',
        }),
      ],
      TODAY,
    );
    expect(rows.find((r) => r.seq === 12)?.band?.label).toBe('1 Aug · Rate 8.5% → 8.25% · EMI reduced to ₹36,603');
  });

  it('a prepayment that reduces the EMI says to what', () => {
    const rows = buildScheduleRows(
      loanFixture(),
      scheduleFixture(),
      [eventFixture({ id: 'e3', effectiveDate: '2026-08-01', adjustmentMode: 'reduce_emi' })],
      TODAY,
    );
    expect(rows.find((r) => r.seq === 12)?.band?.label).toBe('1 Aug · Prepayment ₹2,00,000 · EMI reduced to ₹36,603');
  });

  it('names a foreclosure and joins events that fall between the same two EMIs', () => {
    const rows = buildScheduleRows(
      loanFixture(),
      scheduleFixture(),
      [
        eventFixture({ id: 'f1', eventType: 'foreclosure', effectiveDate: '2026-10-20', amount: 4000000, adjustmentMode: null }),
        eventFixture({ id: 'p1', effectiveDate: '2026-10-10' }),
      ],
      TODAY,
    );
    const band = rows.find((r) => r.seq === 15)?.band;
    expect(band?.key).toBe('p1+f1');
    expect(band?.label).toBe('10 Oct · Prepayment ₹2,00,000 · tenure reduced; 20 Oct · Foreclosure ₹40,00,000');
  });

  it('an event before the first EMI sits above it; one after the last EMI has no row', () => {
    const rows = buildScheduleRows(
      loanFixture(),
      scheduleFixture(),
      [eventFixture({ id: 'early', effectiveDate: '2026-01-01' }), eventFixture({ id: 'late', effectiveDate: '2030-01-01' })],
      TODAY,
    );
    expect(rows[0].band?.key).toBe('early');
    expect(rows.some((r) => r.band?.key.includes('late'))).toBe(false);
  });

  it('keeps the rows in installment order and the band with its row when a financial year is filtered', () => {
    const rows = buildScheduleRows(
      loanFixture(),
      [...scheduleFixture()].reverse(),
      [eventFixture({ id: 'e1', effectiveDate: '2027-03-01' })],
      TODAY,
    );
    expect(rows.map((r) => r.seq)).toEqual([11, 12, 13, 14, 15, 16, 17]);
    expect(rows.filter((r) => r.fy === '2027').map((r) => r.band?.key)).toEqual(['e1']);
  });
});

describe('fySplits', () => {
  it('runs from the first EMI year through the year after today, capped at the last EMI year', () => {
    const long = [installment(1, '2025-08-05'), installment(2, '2026-05-05'), installment(3, '2027-05-05'), installment(4, '2028-05-05')];
    expect(fySplits(long, '2026-10-13').map((s) => s.label)).toEqual(['FY 25-26', 'FY 26-27', 'FY 27-28']);
    expect(fySplits(long.slice(0, 2), '2026-10-13').map((s) => s.label)).toEqual(['FY 25-26', 'FY 26-27']);
  });

  it('sums EMIs, interest and principal per year, with the EMI total compact', () => {
    const [fy] = fySplits(scheduleFixture(), TODAY);
    expect(fy).toMatchObject({ label: 'FY 26-27', emis: 6, interest: 6 * 28875, principal: 6 * 7728, emiTotal: '₹2.22L' });
  });

  it('keeps an empty year between EMIs and has nothing for no installments', () => {
    const gap = [installment(1, '2024-05-05'), installment(2, '2026-05-05')];
    expect(fySplits(gap, '2024-06-01').map((s) => [s.label, s.emis])).toEqual([['FY 24-25', 1], ['FY 25-26', 0]]);
    expect(fySplits([], TODAY)).toEqual([]);
  });

  it('shows crore totals and whole rupees under a lakh', () => {
    expect(fySplits([installment(1, '2026-05-05', { emi: 12_000_000 })], TODAY)[0].emiTotal).toBe('₹1.2Cr');
    expect(fySplits([installment(1, '2026-05-05', { emi: 4500 })], TODAY)[0].emiTotal).toBe('₹4,500');
  });
});

describe('paise rows', () => {
  it('keeps the paise on the table and the phone line', () => {
    const [row] = buildScheduleRows(
      loanFixture(),
      [installment(1, '2026-05-05', { openingBalance: 4448680.4, emi: 44186.01, interest: 31414.66, principal: 12771.34, closingBalance: 4435909.06 })],
      [],
      TODAY,
    );
    expect(row).toMatchObject({ opening: '44,48,680.40', emi: '44,186.01', interest: '31,414.66', principal: '12,771.34', closing: '44,35,909.06' });
    expect(row.phoneSub).toBe('interest 31,414.66 · principal 12,771.34');
  });
});
