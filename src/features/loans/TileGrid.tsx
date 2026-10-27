import React from 'react';

import { KpiTile, Text } from '@/components/ds';

import type { TileModel } from './loanFormat';

/** The four tiles of a tab. `tiles` null = the summary request failed: each tile says so under its label. */
export function TileGrid({
  tiles,
  labels,
  error,
}: {
  tiles: TileModel[] | null;
  labels: string[];
  error: string;
}) {
  return (
    <div className="grid grid-cols-2 desk:grid-cols-4 gap-x-space-12 gap-y-space-8 desk:gap-space-16">
      {tiles
        ? tiles.map((tile) => (
            <KpiTile
              key={tile.label}
              label={tile.label}
              value={
                tile.tone ? (
                  <Text as="span" variant="figure" tone={tile.tone}>
                    {tile.value}
                  </Text>
                ) : (
                  tile.value
                )
              }
              context={tile.context}
            />
          ))
        : labels.map((label) => <KpiTile key={label} label={label} error={error} />)}
    </div>
  );
}

export function TileGridSkeleton() {
  return (
    <div className="grid grid-cols-2 desk:grid-cols-4 gap-x-space-12 gap-y-space-8 desk:gap-space-16">
      <KpiTile loading />
      <KpiTile loading />
      <KpiTile loading />
      <KpiTile loading />
    </div>
  );
}
