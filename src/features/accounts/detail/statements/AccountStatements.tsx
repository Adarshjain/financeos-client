import React from 'react';

import { Banner } from '@/components/ds';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { buildDetailModel } from './detailModel';
import { buildStatementRow } from './listModel';
import { MarkPaidAction } from './MarkPaidAction';
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
    return <Banner tone="danger">Could not load the statements. Reload the page to try again.</Banner>;
  }
  if (data.statements.length === 0) return <StatementsEmpty accountId={account.id} />;

  const { view } = data;
  const rows = view.inFy.map((s) =>
    buildStatementRow(s, data.bills[s.id] ?? null, isCard, view.selectedId)
  );
  const selected = view.selectedId;

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {data.markPaid ? <MarkPaidAction accountName={account.name} target={data.markPaid} /> : null}
      <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
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
          <div className="desk:col-span-7 min-w-0">
            {data.detail ? (
              <StatementDetailCard
                accountId={account.id}
                fy={view.fy}
                model={buildDetailModel(data.detail, data.bills[selected] ?? null, isCard)}
              />
            ) : (
              <Banner tone="danger">Failed to load statement details</Banner>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
