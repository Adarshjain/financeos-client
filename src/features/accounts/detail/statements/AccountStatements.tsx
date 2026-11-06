import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { GRID_GAP } from '@/components/ds/gridGap';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { CoverageStrip } from './CoverageStrip';
import { buildDetailModel } from './detailModel';
import { buildListRows, buildStatementRow } from './listModel';
import { MarkPaidAction } from './MarkPaidAction';
import { ScrollIntoViewOnSelect } from './ScrollIntoViewOnSelect';
import { StatementDetailCard } from './StatementDetailCard';
import { loadStatementsData } from './statementsData';
import { StatementsEmpty } from './StatementsEmpty';
import { StatementsListCard } from './StatementsListCard';

/** The Statements tab of a credit card or bank account (boards D-account-statements, P-account-statements). */
export async function AccountStatements({
  account,
  params,
  today,
}: {
  account: Account;
  params: { fy?: string; statement?: string };
  today: string;
}) {
  const isCard = account.type === AccountType.CREDIT_CARD;
  const data = await loadStatementsData(account, params, today);

  if (!data.statements || !data.view) {
    return <Banner tone="danger">Couldn&apos;t load statements. Try again.</Banner>;
  }
  const strip = data.coverage ? <CoverageStrip accountId={account.id} coverage={data.coverage} /> : null;
  if (data.statements.length === 0) {
    return (
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        {strip}
        <StatementsEmpty accountId={account.id} />
      </div>
    );
  }

  const { view } = data;
  const rows = buildListRows(
    view.inFy,
    (s) => buildStatementRow(s, data.bills[s.id] ?? null, isCard, view.selectedId),
    isCard ? data.skips : null,
    view.fy
  );
  const selected = view.selectedId;

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {strip}
      {data.markPaid ? <MarkPaidAction accountName={account.name} target={data.markPaid} /> : null}
      <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
        <div className="desk:col-span-5 min-w-0">
          <StatementsListCard
            accountId={account.id}
            isCard={isCard}
            fy={view.fy}
            fyOptions={view.fyOptions}
            rows={rows}
          />
        </div>
        {selected ? (
          <ScrollIntoViewOnSelect selectedId={selected} fromAddress={Boolean(params.statement)} className="desk:col-span-7 min-w-0">
            {data.detail ? (
              <StatementDetailCard
                accountId={account.id}
                fy={view.fy}
                model={buildDetailModel(data.detail, data.bills[selected] ?? null, isCard)}
              />
            ) : (
              <Banner tone="danger">Couldn&apos;t load statement details. Try again.</Banner>
            )}
          </ScrollIntoViewOnSelect>
        ) : null}
      </div>
    </div>
  );
}
