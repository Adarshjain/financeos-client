'use client';

import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { Button, Card, Conceal, EmptyState, ListRow, Pager, showToast, Skeleton, Text } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { watchSession } from '@/lib/authExpiry';
import type { DividendSuggestion, DividendSuggestionsResponse } from '@/lib/types';

import { acceptDividendSuggestions, scanDividendSuggestions } from './dividendsActions';
import { BY_INSTRUMENT_SIZE, BY_INSTRUMENT_YEARS, type ByInstrumentRow, suggestionNote, suggestionRow } from './dividendsModel';
import { useDividendMutations } from './useDividendMutations';

export interface ByInstrumentCardProps {
  rows: ByInstrumentRow[];
  page: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** What each instrument paid in the last three financial years, biggest first. */
export function ByInstrumentCard({ rows, page, totalElements, totalPages, onPageChange }: ByInstrumentCardProps) {
  return (
    <Card title="By instrument" subtitle={`Last ${BY_INSTRUMENT_YEARS} financial years`}>
      {rows.length === 0 ? <EmptyState compact description="No dividends in the last 3 financial years." /> : null}
      {rows.map((row) => (
        <ListRow
          key={row.id}
          title={row.title}
          trailing={
            <Text variant="body-strong">
              <Conceal>{row.net}</Conceal>
            </Text>
          }
        />
      ))}
      {totalPages > 1 ? (
        <Pager page={page} size={BY_INSTRUMENT_SIZE} totalElements={totalElements} totalPages={totalPages} unit="instruments" onPageChange={onPageChange} />
      ) : null}
    </Card>
  );
}

/** The scan's cache key. It sits outside the investments keys, so no mutation re-runs the (slow, Yahoo-backed) scan. */
export const suggestionsKey = (brokerAccountId?: string) => ['dividend-suggestions', brokerAccountId ?? ''] as const;

/** Takes recorded suggestions out of the open scan, so they leave the card without a new scan. */
export function dropSuggestions(qc: QueryClient, brokerAccountId: string | undefined, keysToDrop: string[]): void {
  qc.setQueryData<DividendSuggestionsResponse>(suggestionsKey(brokerAccountId), (old) =>
    old ? { ...old, suggestions: old.suggestions.filter((s) => !keysToDrop.includes(suggestionRow(s, '').key)) } : old,
  );
}

export interface SuggestionsCardProps {
  thisYear: string;
  /** The page's broker filter, sent to the scan. */
  brokerAccountId?: string;
  /** Opens the record form for one suggestion. */
  onRecord: (suggestion: DividendSuggestion) => void;
}

/**
 * Past payouts on shares you held that are not recorded yet. It scans once when the page opens (and not again
 * for any change made here); Rescan scans again. One Record opens the form, so the pay date can be set.
 */
export function SuggestionsCard({ thisYear, brokerAccountId, onRecord }: SuggestionsCardProps) {
  const qc = useQueryClient();
  const mutations = useDividendMutations();
  const [recordingAll, setRecordingAll] = React.useState(false);
  const scan = useQuery({
    queryKey: suggestionsKey(brokerAccountId),
    queryFn: async () => {
      const result = await watchSession(scanDividendSuggestions(brokerAccountId));
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const suggestions = scan.data?.suggestions ?? [];
  const rows = suggestions.map((s) => ({ s, row: suggestionRow(s, thisYear) }));

  /** Records every suggestion at the amount and date the scan estimated. */
  const recordAll = async () => {
    if (rows.length === 0) return;
    setRecordingAll(true);
    try {
      const result = await watchSession(
        acceptDividendSuggestions({
          items: rows.map(({ s }) => ({
            holdingId: s.holdingId,
            exDate: s.exDate,
            payDate: s.exDate,
            amount: Number(s.estimatedAmount),
            perUnit: s.perUnit ? Number(s.perUnit) : undefined,
            notes: suggestionNote(s),
          })),
        }),
      );
      if (!result.success) throw new Error(result.error.message);
      const { created, skippedCount } = result.data;
      showToast(`Recorded ${created.length} ${created.length === 1 ? 'dividend' : 'dividends'}${skippedCount > 0 ? ` (${skippedCount} skipped as duplicate)` : ''}`);
      dropSuggestions(qc, brokerAccountId, rows.map((r) => r.row.key));
      await mutations.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to record the dividends'), { tone: 'danger' });
    } finally {
      setRecordingAll(false);
    }
  };

  const checked = scan.data?.scannedSymbols ?? 0;
  const skipped = scan.data?.skippedSymbols ?? [];

  return (
    <Card
      title={rows.length > 0 ? `Suggestions · ${rows.length}` : 'Suggestions'}
      subtitle="Paid on shares you held, not recorded yet"
      action={
        <span className="flex items-center gap-space-12">
          <Button variant="link" size="sm" disabled={scan.isFetching || recordingAll} onClick={() => void scan.refetch()}>
            Rescan
          </Button>
          {rows.length > 0 ? (
            <Button variant="link" size="sm" disabled={recordingAll} onClick={() => void recordAll()}>
              {`Record ${rows.length}`}
            </Button>
          ) : null}
        </span>
      }
    >
      {scan.isPending || (scan.isFetching && !scan.data) ? (
        <div className="flex flex-col gap-space-8 px-space-16 py-space-12">
          <Skeleton height={14} width="60%" />
          <Skeleton height={14} width="40%" />
        </div>
      ) : scan.isError ? (
        <EmptyState compact description="Could not scan for dividends. Try again." action={{ label: 'Rescan', variant: 'link', onSelect: () => void scan.refetch() }} />
      ) : rows.length === 0 ? (
        <EmptyState compact description="Nothing new found" />
      ) : (
        rows.map(({ s, row }) => (
          <ListRow
            key={row.key}
            title={row.title}
            subtitle={row.line}
            trailing={
              <Button size="sm" disabled={recordingAll} onClick={() => onRecord(s)}>
                Record
              </Button>
            }
          />
        ))
      )}
      {scan.data ? (
        <Text variant="caption" tone="ink-3" as="div" className="px-space-16 py-space-8">
          {`Checked ${checked} ${checked === 1 ? 'symbol' : 'symbols'}${skipped.length > 0 ? `. Could not check ${skipped.join(', ')}` : ''}.`}
        </Text>
      ) : null}
    </Card>
  );
}
