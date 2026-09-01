'use client';

import { Plus, Trash } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { DatasourceCatalog } from '@/lib/reports.types';

import type { DimensionDraft } from '../builderReducer';
import { newDraftId } from '../builderReducer';
import { DimensionRefEditor } from '../DimensionRefEditor';

export interface DimensionListProps {
  label: string;
  addLabel: string;
  catalog: DatasourceCatalog;
  drafts: DimensionDraft[];
  exclude: string[];
  onChange: (drafts: DimensionDraft[]) => void;
}

// A reusable add/remove list of dimension pickers (used for rows and columns).
export function DimensionList({
  label,
  addLabel,
  catalog,
  drafts,
  exclude,
  onChange,
}: DimensionListProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {drafts.map((g, i) => (
        <div key={g.id} className="flex items-center gap-2">
          <div className="flex-1">
            <DimensionRefEditor
              catalog={catalog}
              type="TABLE"
              value={g}
              exclude={[
                ...exclude,
                ...drafts
                  .filter((x, idx) => idx !== i && x.field)
                  .map((x) => x.field as string),
              ]}
              onChange={(next) =>
                onChange(
                  drafts.map((x, idx) =>
                    idx === i ? { ...next, id: x.id } : x
                  )
                )
              }
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(drafts.filter((_, idx) => idx !== i))}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onChange([...drafts, { id: newDraftId() }])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}
