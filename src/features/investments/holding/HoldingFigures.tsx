'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { Figures } from '@/components/ds/Figures/Figures';
import { Hero } from '@/components/ds/Hero/Hero';

import { HERO_FIGURE_IDS, type HoldingFigure, type HoldingHeroModel } from './holdingModel';

export interface HoldingFiguresProps {
  hero: HoldingHeroModel;
  figures: HoldingFigure[];
}

/** The top of a holding: the current value with today's move, then Invested, ₹ return and XIRR. Same at both sizes. */
export function HoldingHero({ hero, figures }: HoldingFiguresProps) {
  const shown = HERO_FIGURE_IDS.map((id) => figures.find((f) => f.id === id)).filter((f): f is HoldingFigure => Boolean(f));
  return (
    <Hero
      label="Current value"
      value={<Conceal>{hero.value}</Conceal>}
      change={hero.line ? { text: <Conceal>{hero.line.text}</Conceal>, tone: hero.line.tone } : undefined}
      figures={shown.map((f) => ({
        label: f.label,
        value: <Conceal>{f.value}</Conceal>,
        tone: f.tone,
        caption: f.context ? <Conceal>{f.context}</Conceal> : undefined,
      }))}
    />
  );
}

/** The other five figures (quantity, average cost, LTP, realised P&L, charges), as figures in a card above the chart. */
export function PositionCard({ figures, onOverride }: { figures: HoldingFigure[]; onOverride: () => void }) {
  const rest = figures.filter((f) => !HERO_FIGURE_IDS.includes(f.id));
  return (
    <Card title="Position">
      <div className="px-space-16 pb-space-16">
        <Figures
          size="sm"
          figures={rest.map((f) => ({
            label: f.label,
            value: <Conceal>{f.value}</Conceal>,
            tone: f.tone,
            caption:
              f.context || f.override ? (
                <>
                  <Conceal>{f.context ?? ''}</Conceal>
                  {f.override ? (
                    <>
                      {f.context ? ' · ' : ''}
                      <Button variant="link" size="sm" onClick={onOverride}>
                        override
                      </Button>
                    </>
                  ) : null}
                </>
              ) : undefined,
          }))}
        />
      </div>
    </Card>
  );
}
