'use client';

import React from 'react';

import { Conceal } from '@/components/ds/Conceal/Conceal';
import { Hero } from '@/components/ds/Hero/Hero';
import { formatMoney } from '@/lib/format';

import { RetirementCard, RetirementCardSkeleton } from './RetirementCard';
import { type RetirementModel } from './retirementModel';

/** The Retirement tab: the total on phone and desktop, then the Retirement card (the one Accounts shows too). */
export function RetirementScreen({ model }: { model: RetirementModel }) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {model.rows.length > 0 ? <Hero label="Retirement value" value={<Conceal>{formatMoney(model.total)}</Conceal>} /> : null}
      <RetirementCard model={model} />
    </div>
  );
}

/** The overview while it loads. */
export function RetirementSkeleton() {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Hero.Skeleton label />
      <RetirementCardSkeleton />
    </div>
  );
}
