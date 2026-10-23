'use client';

import React from 'react';

import {
  Checkbox,
  DateField,
  ListRow,
  Radio,
  SegmentedControl,
  Select,
  Skeleton,
  Text,
  TextField,
} from '@/components/ds';
import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { plainAmount } from '@/features/loans/loanFormat';
import { amountExpressionProps } from '@/lib/amountExpression';
import { todayInAppZone } from '@/lib/date-range';
import { usePositions } from '@/lib/query/hooks/useInvestments';
import { sanitizeDecimalInput } from '@/lib/utils';

import { expectedNet } from './dividendLinkHelpers';
import type { DividendLinkMode, UseDividendLinkResult } from './useDividendLink';

const RECEIPT_WORDS: Record<string, string> = {
  awaiting: 'Awaiting',
  overdue: 'Overdue',
  unverifiable: 'Unverifiable',
};

const TYPE_OPTIONS = [
  { value: 'dividend', label: 'Dividend' },
  { value: 'interest', label: 'Interest' },
  { value: 'other', label: 'Other' },
];

/** The gross amount of a per-share payout, or null until both numbers are in. */
export function grossOf(perShare: string, shares: string): string | null {
  const gross = Number(perShare) * Number(shares);
  if (!(Number(perShare) > 0) || !(Number(shares) > 0) || !Number.isFinite(gross)) return null;
  return String(Math.round(gross * 100) / 100);
}

/** Dividend: attach the credit to a declared dividend, or record a new one on the stored fields and link it. */
export function DividendLinkBody({ dividend }: { dividend: UseDividendLinkResult }) {
  const today = todayInAppZone();
  const { mode, setMode } = dividend;

  return (
    <>
      <SegmentedControl<DividendLinkMode>
        fullWidth
        value={mode}
        onValueChange={setMode}
        options={[
          { value: 'existing', label: 'Declared dividend' },
          { value: 'new', label: 'New dividend' },
        ]}
      />
      {mode === 'new' ? <NewDividendFields dividend={dividend} today={today} /> : <DeclaredDividends dividend={dividend} />}
    </>
  );
}

function DeclaredDividends({ dividend }: { dividend: UseDividendLinkResult }) {
  return (
    <>
      <TextField
        label="Search"
        placeholder="Symbol, instrument or broker"
        value={dividend.search}
        onValueChange={dividend.setSearch}
      />
      {dividend.loadingDividends ? (
        <Skeleton width="60%" height={14} />
      ) : dividend.dividends.length === 0 ? (
        <Text variant="body" tone="ink-3" as="p">
          No unmatched dividends. Record a new one instead.
        </Text>
      ) : (
        <div role="radiogroup" aria-label="Declared dividends" className="flex flex-col">
          {dividend.dividends.map((d) => {
            const checked = dividend.selectedId === d.id;
            const title = d.symbol || d.instrumentName;
            const receipt = RECEIPT_WORDS[String(d.receiptStatus)];
            return (
              <ListRow
                key={d.id}
                role="radio"
                aria-checked={checked}
                aria-label={title}
                className="px-0"
                wrap
                onClick={() => dividend.setSelectedId(d.id)}
                leading={<Radio checked={checked} tabIndex={-1} aria-hidden="true" />}
                title={title}
                subtitle={[d.brokerName, formatDayMonth(d.exDate ?? d.payDate), receipt].filter(Boolean).join(' · ')}
                trailing={
                  <Text variant="body-strong" as="span">
                    {`₹${plainAmount(expectedNet(d))}`}
                  </Text>
                }
              />
            );
          })}
        </div>
      )}
      {dividend.tdsGap !== null ? (
        <ListRow
          role="checkbox"
          aria-checked={dividend.recordTds}
          aria-label={`Record TDS of ₹${plainAmount(dividend.tdsGap)}`}
          className="px-0"
          onClick={() => dividend.setRecordTds(!dividend.recordTds)}
          leading={<Checkbox checked={dividend.recordTds} tabIndex={-1} aria-hidden="true" />}
          title={`Record TDS of ₹${plainAmount(dividend.tdsGap)}`}
        />
      ) : null}
    </>
  );
}

function NewDividendFields({ dividend, today }: { dividend: UseDividendLinkResult; today: string }) {
  const { data: positions = [], isLoading } = usePositions();
  const [perShare, setPerShare] = React.useState('');
  const [shares, setShares] = React.useState('');
  const { setAmount } = dividend;

  // Per share × shares is the gross; typing either one writes it, the gross can still be typed over.
  const change = (nextPerShare: string, nextShares: string) => {
    setPerShare(nextPerShare);
    setShares(nextShares);
    const gross = grossOf(nextPerShare, nextShares);
    if (gross) setAmount(gross);
  };

  return (
    <>
      <Select
        label="Instrument"
        placeholder={isLoading ? 'Loading holdings…' : 'Select holding'}
        loading={isLoading}
        value={dividend.holding || ''}
        onValueChange={(v) => dividend.setHolding(v as string)}
        options={positions.map((p) => ({
          value: `${p.brokerAccountId}|${p.instrument.id}`,
          label: p.instrument.symbol ?? p.instrument.name,
          hint: p.brokerName,
        }))}
      />
      <Select
        label="Kind"
        value={dividend.type}
        onValueChange={(v) => dividend.setType(v as typeof dividend.type)}
        options={TYPE_OPTIONS}
      />
      <div className="grid grid-cols-2 gap-space-12">
        <TextField
          label="Per share"
          optional
          prefix="₹"
          inputMode="decimal"
          value={perShare}
          onValueChange={(v) => change(sanitizeDecimalInput(v), shares)}
        />
        <TextField
          label="Shares"
          optional
          inputMode="numeric"
          value={shares}
          onValueChange={(v) => change(perShare, v.replace(/\D/g, ''))}
        />
      </div>
      <div className="grid grid-cols-1 desk:grid-cols-2 gap-space-12">
        <TextField
          label="Gross amount"
          prefix="₹"
          inputMode="decimal"
          value={dividend.amount}
          {...amountExpressionProps(dividend.amount, dividend.setAmount)}
          error={dividend.amountError}
        />
        <TextField
          label="TDS"
          optional
          prefix="₹"
          inputMode="decimal"
          value={dividend.tds}
          {...amountExpressionProps(dividend.tds, dividend.setTds)}
          error={dividend.tdsError}
        />
      </div>
      <DateField
        label="Record date"
        optional
        today={today}
        value={dividend.exDate}
        onValueChange={(v) => dividend.setExDate(typeof v === 'string' ? v : '')}
      />
      <TextField label="Notes" optional value={dividend.notes} onValueChange={dividend.setNotes} />
    </>
  );
}
