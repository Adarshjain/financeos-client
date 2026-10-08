import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums text-slate-900 dark:text-white text-right">{value}</span>
    </div>
  );
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
  const limit = card?.creditLimit ?? 0;
  const utilization = card && limit > 0 ? (Math.abs(card.balance ?? 0) / limit) * 100 : 0;
  const cardholders = card?.cardholders ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {card ? (
          <div className="space-y-1.5">
            <Row label="Credit limit" value={formatMoney(limit)} />
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  utilization > 70 ? 'bg-rose-500' : utilization > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                )}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
            <div className="text-2xs text-slate-500">Utilisation {utilization.toFixed(1)}%</div>
            {card.issuer || card.productName ? (
              <Row label="Card" value={[card.issuer, card.productName].filter(Boolean).join(' ')} />
            ) : null}
          </div>
        ) : null}
        {rows.map(([l, v]) => (
          <Row key={l} label={l} value={v} />
        ))}
        {cardholders.length > 0 ? (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <div className="text-2xs font-semibold text-slate-400 uppercase">Cardholders</div>
            {cardholders.map((ch) => {
              const last4 = ch.currentLast4 ?? ch.cards?.find((c) => !c.closedOn)?.last4;
              return (
                <Row
                  key={ch.id}
                  label={ch.personName || (ch.role === 'PRIMARY' ? 'Primary' : 'Add-on')}
                  value={last4 ? `•••• ${last4}` : 'No active card'}
                />
              );
            })}
          </div>
        ) : null}
        {rows.length === 0 && !card ? (
          <div className="text-sm text-slate-500">No further details.</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
