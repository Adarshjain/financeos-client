'use client';

import React from 'react';

import { Badge, Button, Conceal, KpiTile, Text } from '@/components/ds';

import type { HoldingFigure, HoldingHeaderModel, HoldingHeroModel } from './holdingModel';

/** The context line of a figure; the LTP figure ends with an "override" link. */
function Context({ figure, onOverride }: { figure: HoldingFigure; onOverride: () => void }) {
  if (!figure.context && !figure.override) return null;
  return (
    <Text variant="label" tone="ink-3" as="div">
      <Conceal>{figure.context ?? ''}</Conceal>
      {figure.override ? (
        <>
          {figure.context ? ' · ' : ''}
          <Button variant="link" size="sm" onClick={onOverride}>
            override
          </Button>
        </>
      ) : null}
    </Text>
  );
}

export interface HoldingFiguresProps {
  header: HoldingHeaderModel;
  hero: HoldingHeroModel;
  figures: HoldingFigure[];
  onOverride: () => void;
  onRecordDividend: () => void;
  onRecordCorporateAction: () => void;
}

/**
 * The top of a holding: its particulars, the current value with its move, and eight figures. The phone shows
 * the value as the hero and the figures as pairs; the desktop shows the value at the right with the record
 * links and the figures as tiles.
 */
export function HoldingFigures({ header, hero, figures, onOverride, onRecordDividend, onRecordCorporateAction }: HoldingFiguresProps) {
  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <div className="flex flex-col gap-space-12 desk:flex-row desk:items-end desk:justify-between">
        <div className="min-w-0 flex flex-wrap items-center gap-space-8">
          <Badge tone="neutral">{header.badge}</Badge>
          <Text variant="body" tone="ink-3" as="span">
            {header.meta}
          </Text>
        </div>
        <div className="flex items-end gap-space-16">
          <div className="flex flex-col gap-space-2">
            <Text variant="label" tone="ink-3" as="div" className="desk:hidden">
              Current value
            </Text>
            <Text variant="overline" tone="ink-3" as="div" className="max-desk:hidden">
              Current value
            </Text>
            <Text variant="hero-figure" family="display" as="div">
              {hero.value}
            </Text>
            {hero.line ? (
              <Text variant="label" tone={hero.line.tone} as="div">
                <Conceal>{hero.line.text}</Conceal>
              </Text>
            ) : null}
          </div>
          <div className="max-desk:hidden flex items-center gap-space-8">
            <Button variant="secondary" onClick={onRecordDividend}>
              Dividend
            </Button>
            <Button variant="secondary" onClick={onRecordCorporateAction}>
              Corporate action
            </Button>
          </div>
        </div>
      </div>

      <div className="desk:hidden grid grid-cols-2 gap-x-space-16 gap-y-space-12">
        {figures.map((f) => (
          <div key={f.id} className="min-w-0 flex flex-col gap-space-2">
            <Text variant="label" tone="ink-3" as="div">
              {f.label}
            </Text>
            <Text variant="figure" tone={f.tone} as="div">
              <Conceal>{f.value}</Conceal>
            </Text>
            <Context figure={f} onOverride={onOverride} />
          </div>
        ))}
      </div>
      <Button variant="secondary" fullWidth className="desk:hidden" onClick={onRecordDividend}>
        Dividend
      </Button>

      <div className="max-desk:hidden grid grid-cols-4 gap-space-16">
        {figures.map((f) => (
          <KpiTile
            key={f.id}
            label={f.label}
            value={
              f.tone ? (
                <Text as="span" variant="figure" tone={f.tone}>
                  {f.value}
                </Text>
              ) : (
                f.value
              )
            }
            context={<Context figure={f} onOverride={onOverride} />}
          />
        ))}
      </div>
    </div>
  );
}
