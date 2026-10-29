import React from 'react';

import { Hero, Text } from '@/components/ds';

import type { HeroModel } from './loanFormatModel';

/** The hero of a tab. `hero` null = the summary request failed: it says so in the hero's place. */
export function HeroBlock({ hero, error, children }: { hero: HeroModel | null; error: string; children?: React.ReactNode }) {
  if (!hero) {
    return (
      <Text variant="body" tone="ink-3" as="div">
        {error}
      </Text>
    );
  }
  return (
    <Hero
      label={hero.label}
      value={hero.value}
      valueTone={hero.tone}
      change={hero.change}
      figures={hero.figures}
    >
      {children}
    </Hero>
  );
}

/** The hero while the tab loads. */
export function HeroBlockSkeleton({ figures = 2 }: { figures?: number }) {
  return <Hero.Skeleton label change={false} figures={figures} />;
}
