import { Info } from 'lucide-react';

import { type Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { formatUtilisation, utilisationBarWidth, utilisationToneClasses } from '@/lib/utilisation';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { SectionCard } from './SectionCard';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function AccountOverview({ account }: { account: Account }) {
  const rows: Array<[string, string]> = [];
  if (account.description) rows.push(['Description', account.description]);
  if (account.balanceAnchored && account.anchorDate) {
    rows.push(['Balance anchored', formatDate(account.anchorDate)]);
  }
  if (account.closedOn) rows.push(['Closed on', formatDate(account.closedOn)]);
  if ('ingestFromDate' in account && account.ingestFromDate) {
    rows.push(['Gmail sync from', formatDate(account.ingestFromDate)]);
  }
  if ('lastStatementDate' in account && account.lastStatementDate) {
    rows.push(['Last statement', formatDate(account.lastStatementDate)]);
  }
  if (account.type === AccountType.BROKER && account.cashBalance !== undefined) {
    rows.push(['Cash balance', formatMoney(account.cashBalance)]);
  }

  const card = account.type === AccountType.CREDIT_CARD ? account : null;
  // The limit the utilisation is measured against (credit limit, else the latest statement's).
  const limit = card?.effectiveCreditLimit ?? null;
  // Live owed ÷ limit, computed by the server (a card in credit is 0%, not "utilised").
  const utilization = card?.utilizationPct ?? null;
  const cardholders = card?.cardholders ?? [];
  if (card && (card.issuer || card.productName)) {
    rows.unshift(['Card', [card.issuer, card.productName].filter(Boolean).join(' ')]);
  }

  return (
    <SectionCard icon={<Info />} title="Overview" data-testid="account-overview">
      <div className="space-y-4">
        {card ? (
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">Credit limit</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                {limit != null ? formatMoney(limit) : 'Not set'}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700">
              <div
                className={cn('h-full rounded-full', utilisationToneClasses(utilization).bar)}
                style={{ width: utilisationBarWidth(utilization) }}
              />
            </div>
            <div className="mt-1.5 text-2xs text-slate-500 dark:text-slate-400">
              Utilisation {formatUtilisation(utilization)}
            </div>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(([l, v]) => (
              <Detail key={l} label={l} value={v} />
            ))}
          </dl>
        ) : null}

        {cardholders.length > 0 ? (
          <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="text-2xs font-semibold uppercase tracking-wide text-slate-400">Cardholders</div>
            <ul className="space-y-2">
              {cardholders.map((ch) => {
                const last4 = ch.currentLast4 ?? ch.cards?.find((c) => !c.closedOn)?.last4;
                const name = ch.personName || (ch.role === 'PRIMARY' ? 'Primary' : 'Add-on');
                return (
                  <li key={ch.id} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {initials(name) || '•'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-white">{name}</span>
                    <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                      {last4 ? `•••• ${last4}` : 'No active card'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {rows.length === 0 && !card ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No further details.</p>
        ) : null}
      </div>
    </SectionCard>
  );
}
