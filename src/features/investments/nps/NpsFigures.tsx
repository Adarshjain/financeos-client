import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { Hero } from '@/components/ds/Hero/Hero';
import { formatDate } from '@/lib/format';

import type { NpsFigures, NpsSummary } from './npsModel';
import { monthYear } from './npsModel';

/** The headline: the NPS value with the NAV date, then invested, gain and contributed this FY. */
export function NpsHero({ figures }: { figures: NpsFigures }) {
  const { gain, contributed } = figures;
  return (
    <Hero
      label="NPS value"
      value={<Conceal>{figures.value}</Conceal>}
      change={figures.dayChange ? figures.dayChange : figures.context ? { text: figures.context } : undefined}
      figures={[
        { label: 'Invested', value: <Conceal>{figures.invested}</Conceal>, caption: <Conceal>{figures.investedSplit}</Conceal> },
        { label: 'Gain', value: <Conceal>{gain.value}</Conceal>, tone: gain.tone, caption: gain.caption ? <Conceal>{gain.caption}</Conceal> : undefined },
        { label: 'Contributed this FY', value: <Conceal>{contributed.value}</Conceal>, caption: contributed.caption },
      ]}
    />
  );
}

/** What needs a word above the tab: estimated units (info), units that disagree with the statement (amber). */
export function NpsBanners({
  flags,
  uploadHref,
  statementEnd,
  frozenAsOf,
}: {
  flags: NpsSummary['flags'];
  uploadHref: string;
  statementEnd?: string | null;
  /** Set when the selected PRAN is frozen: the status date (may be empty). */
  frozenAsOf?: string | null;
}) {
  const stale = flags.statementStale && !!statementEnd;
  const frozen = frozenAsOf !== undefined;
  if (!frozen && !flags.hasEstimated && !flags.unitsMismatch && !stale) return null;
  const frozenMonth = monthYear(frozenAsOf);
  return (
    <div className="flex flex-col gap-space-8">
      {frozen ? (
        <Banner tone="danger" rounded="md">
          {frozenMonth ? `This PRAN is frozen per your latest statement (${frozenMonth}).` : 'This PRAN is frozen per your latest statement.'}
        </Banner>
      ) : null}
      {stale ? (
        <Banner tone="neutral" rounded="md" action={{ label: 'Upload statement', href: uploadHref }}>
          Your latest statement ends {formatDate(statementEnd, 'full')}. Entries since then come from emails and bank payments.
        </Banner>
      ) : null}
      {flags.hasEstimated ? (
        <Banner tone="info" rounded="md" action={{ label: 'Upload statement', href: uploadHref }}>
          Some units are estimated from your balance or allocation. Upload a statement for exact units.
        </Banner>
      ) : null}
      {flags.unitsMismatch ? (
        <Banner tone="warning" rounded="md" action={{ label: 'Upload statement', href: uploadHref }}>
          Some units are different from your latest statement. Check entries after that date or upload the latest statement.
        </Banner>
      ) : null}
    </div>
  );
}
