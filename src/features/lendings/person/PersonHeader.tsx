'use client';

import React from 'react';

import { Avatar, Button, Icon, Menu, Text } from '@/components/ds';

import { avatarToneFor } from '../list/lendingsList';
import type { PersonHeaderModel } from './personModel';

export interface PersonHeaderProps {
  name: string;
  header: PersonHeaderModel;
  /** Settle up needs something outstanding. */
  canSettle: boolean;
  /** Export needs an entry. */
  canExport: boolean;
  onSettle: () => void;
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
}

/** Who they are and, on the right, what stands between you with Settle up and the menu. */
export function PersonHeader({ name, header, canSettle, canExport, onSettle, onEdit, onExport, onDelete }: PersonHeaderProps) {
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-12 desk:flex-row desk:items-end desk:justify-between">
      <div className="min-w-0 flex items-center gap-space-12">
        <Avatar variant="circle" tone={avatarToneFor(name)} size="lg" initials={header.initials} />
        <Text variant="body" tone="ink-3" as="span">
          {header.meta}
        </Text>
      </div>
      <div className="flex flex-col gap-space-8 desk:flex-row desk:items-center desk:gap-space-16">
        <div className="flex flex-col gap-space-2">
          <Text variant="overline" tone="ink-3" as="div">
            {header.eyebrow}
          </Text>
          <Text variant="figure" tone={header.tone} as="div">
            {header.amount}
          </Text>
          {header.context ? (
            <Text variant="label" tone="ink-3" as="div">
              {header.context}
            </Text>
          ) : null}
        </div>
        <div className="flex items-center gap-space-8">
          {canSettle ? (
            <Button variant="secondary" className="flex-1 desk:flex-none" onClick={onSettle}>
              Settle up
            </Button>
          ) : null}
          <Menu
            align="end"
            trigger={
              <Button variant="ghost" iconOnly aria-label="More actions">
                <Icon name="more" size="md" />
              </Button>
            }
          >
            <Menu.Item onSelect={onEdit}>Edit person</Menu.Item>
            <Menu.Item disabled={!canExport} onSelect={onExport}>
              Export ledger
            </Menu.Item>
            <Menu.Item tone="danger" onSelect={onDelete}>
              Delete person
            </Menu.Item>
          </Menu>
        </div>
      </div>
    </div>
  );
}
