'use client';

import { Checkbox, DateField, ListRow, Radio, SegmentedControl, Select, Skeleton, Text, TextField } from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { amountExpressionProps } from '@/lib/amountExpression';
import { todayInAppZone } from '@/lib/date-range';
import { formatDate, formatMoney } from '@/lib/format';

import {
  EPF_KIND_OPTIONS,
  type EpfLinkMode,
  epfOptionAmount,
  epfOptionNotes,
  epfOptionTitle,
  type EpfWithdrawalKind,
  type UseEpfWithdrawalLinkResult,
} from './useEpfWithdrawalLink';

/** EPF withdrawal: attach the credit to an unlinked withdrawal, or record a new one on the stored fields and link it. */
export function EpfWithdrawalLinkBody({ epf }: { epf: UseEpfWithdrawalLinkResult }) {
  return (
    <>
      <SegmentedControl<EpfLinkMode>
        fullWidth
        value={epf.mode}
        onValueChange={epf.setMode}
        options={[
          { value: 'existing', label: 'EPF withdrawal' },
          { value: 'new', label: 'New withdrawal' },
        ]}
      />
      {epf.mode === 'new' ? <NewWithdrawalFields epf={epf} /> : <ExistingWithdrawals epf={epf} />}
    </>
  );
}

function ExistingWithdrawals({ epf }: { epf: UseEpfWithdrawalLinkResult }) {
  return (
    <>
      <TextField label="Search" placeholder="Employer or kind" value={epf.search} onValueChange={epf.setSearch} />
      {epf.loadingOptions ? (
        <Skeleton width="60%" height={14} />
      ) : epf.optionsError ? (
        <Text variant="body" tone="danger" as="p">
          Could not load the withdrawals. Try again.
        </Text>
      ) : epf.options.length === 0 ? (
        <Text variant="body" tone="ink-3" as="p">
          No unlinked withdrawals. Record a new one instead.
        </Text>
      ) : (
        <div className="flex flex-col">
          {epf.options.map((o) => {
            const checked = epf.selectedId === o.entry.id;
            const title = epfOptionTitle(o.entry);
            return (
              <ListRow
                key={o.entry.id}
                className="px-0"
                wrap
                onClick={() => epf.setSelectedId(o.entry.id)}
                leading={<Radio checked={checked} />}
                title={title}
                subtitle={[formatDate(o.entry.creditedOn, 'full'), ...epfOptionNotes(o)].join(' · ')}
                trailing={
                  <Text variant="body-strong" as="span">
                    {formatMoney(epfOptionAmount(o.entry), { decimals: 'auto' })}
                  </Text>
                }
              />
            );
          })}
        </div>
      )}
      {epf.tdsGap !== null ? (
        <ListRow
          className="px-0"
          onClick={() => epf.setRecordTds(!epf.recordTds)}
          leading={<Checkbox checked={epf.recordTds} />}
          title={`Record TDS of ${formatMoney(epf.tdsGap, { decimals: 'auto' })}`}
        />
      ) : null}
    </>
  );
}

function NewWithdrawalFields({ epf }: { epf: UseEpfWithdrawalLinkResult }) {
  const today = todayInAppZone();
  const pension = epf.kind === 'PENSION';
  return (
    <>
      <Select
        label="Kind"
        value={epf.kind}
        onValueChange={(v) => epf.setKind(v as EpfWithdrawalKind)}
        options={EPF_KIND_OPTIONS}
      />
      <Select
        label="Employer"
        placeholder={epf.loadingEmployers ? 'Loading employers…' : 'Select employer'}
        loading={epf.loadingEmployers}
        value={epf.employerId}
        onValueChange={(v) => epf.setEmployerId(v as string)}
        options={epf.employers.map((e) => ({ value: e.id, label: e.name }))}
      />
      <DateField
        label="Paid on"
        today={today}
        value={epf.creditedOn}
        onValueChange={(v) => epf.setCreditedOn(typeof v === 'string' ? v : '')}
      />
      {pension ? (
        <AmountField
          label="Amount"
          prefix="₹"
          inputMode="decimal"
          value={epf.pension}
          {...amountExpressionProps(epf.pension, epf.setPension)}
          error={epf.pensionError}
        />
      ) : (
        <div className="grid grid-cols-1 desk:grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
          <AmountField
            label="Your share"
            prefix="₹"
            inputMode="decimal"
            value={epf.employee}
            {...amountExpressionProps(epf.employee, epf.setEmployee)}
            error={epf.employeeError}
          />
          <AmountField
            label="Employer share"
            optional
            prefix="₹"
            inputMode="decimal"
            value={epf.employer}
            {...amountExpressionProps(epf.employer, epf.setEmployer)}
            error={epf.employerError}
          />
        </div>
      )}
      <ListRow
        className="px-0"
        leading={<Checkbox id="epf-link-tds-on" checked={epf.tdsOn} onCheckedChange={(on) => epf.setTdsOn(on === true)} />}
        title={<label htmlFor="epf-link-tds-on">TDS was deducted</label>}
      />
      {epf.tdsOn ? (
        <AmountField
          label="TDS"
          prefix="₹"
          inputMode="decimal"
          value={epf.tds}
          {...amountExpressionProps(epf.tds, epf.setTds)}
          error={epf.tdsError}
        />
      ) : null}
      {epf.receivedCaption ? (
        <Text variant="caption" tone="ink-3" as="p">
          {epf.receivedCaption}
        </Text>
      ) : null}
      <TextField label="Note" optional value={epf.note} onValueChange={epf.setNote} />
    </>
  );
}
