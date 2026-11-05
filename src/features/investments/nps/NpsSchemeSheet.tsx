'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { Conceal } from '@/components/ds/Conceal/Conceal';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { watchSession } from '@/lib/authExpiry';
import { formatMoney, formatQuantity } from '@/lib/format';
import { keys } from '@/lib/query/keys';

import { PriceChartCard } from '../holding/PriceChartCard';
import { loadNpsSchemeSheet, type NpsSchemeSheetData } from './npsActions';
import { assetClassLabel, entryRow, type NpsEntry, tierLabel } from './npsModel';

export interface NpsSchemeSheetProps {
  schemeCode: string;
  tier: 'I' | 'II';
  /** The account shown on the tab; the sheet counts only its holdings and entries. */
  accountId: string;
  onClose: () => void;
}

/** One scheme: value, units and NAV, the NAV chart and the entries in it. */
export function NpsSchemeSheet({ schemeCode, tier, accountId, onClose }: NpsSchemeSheetProps) {
  const query = useQuery({
    queryKey: [...keys.nps.all, 'scheme', schemeCode],
    gcTime: 0,
    queryFn: async (): Promise<NpsSchemeSheetData> => {
      const result = await watchSession(loadNpsSchemeSheet(schemeCode));
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
  const data = query.data;
  const scheme = data?.detail.scheme;
  const mine = data?.detail.holdings.filter((h) => h.tier === tier && h.accountId === accountId) ?? [];
  const units = mine.reduce((s, h) => s + h.units, 0);
  const value = mine.reduce((s, h) => s + h.value, 0);
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        title={scheme ? `${assetClassLabel(scheme.assetClass) || scheme.name} · ${tierLabel(tier)}` : 'Scheme'}
        description={scheme ? `${scheme.name}${scheme.pfmName ? ` · ${scheme.pfmName}` : ''} · ${scheme.schemeCode}` : undefined}
        secondary={{ label: 'Close', onSelect: onClose }}
      >
        <Dialog.Body>
          {query.isError ? (
            <Text variant="body" tone="ink-3" as="p">
              Couldn&apos;t load the scheme. Close this and try again.
            </Text>
          ) : !data || !scheme ? (
            <div className="flex flex-col gap-space-8">
              <Skeleton height={32} />
              <Skeleton height={160} />
            </div>
          ) : (
            <div className="flex flex-col gap-space-8 desk:gap-space-16">
              <div>
                <ListRow title="Value" trailing={<Text variant="body-strong" as="span"><Conceal>{formatMoney(value)}</Conceal></Text>} />
                <ListRow title="Units" trailing={<Text variant="body-strong" as="span"><Conceal>{formatQuantity(units, 4)}</Conceal></Text>} />
                <ListRow title="NAV" trailing={<Text variant="body-strong" as="span">{scheme.nav == null ? '—' : formatMoney(scheme.nav, { decimals: 'unit' })}</Text>} />
              </div>
              <PriceChartCard history={data.history} onOpenHistory={() => undefined} hideHistory />
              <div>
                <Text variant="label" tone="ink-3" as="div">
                  Entries in this scheme
                </Text>
                {data.detail.entries.filter((e: NpsEntry) => e.tier === tier && e.accountId === accountId).map((e) => {
                  const row = entryRow(e);
                  const line = e.lines.find((l) => l.schemeCode === schemeCode);
                  return (
                    <ListRow
                      key={e.id}
                      className="px-0"
                      title={row.title}
                      subtitle={`${row.date} · ${row.source}${row.status ? ` · ${row.status}` : ''}`}
                      trailing={
                        <div className="flex flex-col items-end">
                          <Text variant="body-strong" as="div">
                            {line ? formatQuantity(line.units, 4) : '—'}
                          </Text>
                          <Text variant="caption" tone="ink-3" as="div">
                            <Conceal>{line?.amount != null ? formatMoney(line.amount, { decimals: 'auto' }) : ''}</Conceal>
                          </Text>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
