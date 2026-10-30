'use client';

import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Icon } from '@/components/ds/Icon/Icon';
import { ReorderList } from '@/components/ds/ReorderList/ReorderList';
import { Text } from '@/components/ds/Text/Text';
import type { RoutingOptionDto } from '@/lib/api/types';

import { CustomModelFields } from './CustomModelFields';
import { type ProviderOption } from './providersModel';
import type { RoutingGroupEditor } from './routingGroupsModel';
import { draftEntryKey, isCustomEntry } from './useLlmRoutingEditor';

interface RoutingEditorDialogProps {
  /** The group being edited; the dialog is closed while this is null. */
  group: RoutingGroupEditor | null;
  routingOptions: RoutingOptionDto[];
  providers: ProviderOption[];
  error: string | null;
}

/** Reorder a group's fixed menu of options, remove custom rows, and add a typed model (probed first). */
export function RoutingEditorDialog({ group, routingOptions, providers, error }: RoutingEditorDialogProps) {
  const providerName = (id: string | null | undefined) =>
    providers.find((p) => p.id === (id ?? '').toLowerCase())?.name ?? id ?? '';

  const keys = group ? group.draft.map(draftEntryKey) : [];

  return (
    <Dialog open={group !== null} onOpenChange={(open) => !open && group && !group.saving && group.onCancel()}>
      {group ? (
        <Dialog.Content
          size="lg"
          dismissible={!group.saving}
          title={group.dto.displayName}
          description={group.dto.description}
          secondary={{ label: 'Cancel', disabled: group.saving, onSelect: group.onCancel }}
          primary={{
            label: 'Save routing',
            loading: group.saving,
            disabled: group.saving || group.testing || group.draft.length === 0,
            onSelect: group.onSave,
          }}
        >
          <Dialog.Body>
            <div className="flex flex-col gap-space-8 desk:gap-space-12">
              {error ? <Banner tone="danger">{error}</Banner> : null}
              <ReorderList
                items={group.draft.map((item, idx) => {
                  const custom = isCustomEntry(item);
                  const option = custom ? undefined : routingOptions.find((o) => o.id === item.optionId);
                  const hasKey = custom
                    ? providers.some((p) => p.id === (item.provider ?? '').toLowerCase() && p.hasKey)
                    : (option?.available ?? false);
                  const label = custom ? (item.model ?? '') : option?.label || item.optionId;
                  return {
                    id: draftEntryKey(item),
                    ariaLabel: label,
                    title: (
                      <Text variant="body-strong" as="span" tone={hasKey ? 'ink' : 'ink-3'} mono={custom}>
                        {label}
                      </Text>
                    ),
                    subtitle:
                      custom || !hasKey
                        ? [custom ? providerName(item.provider) : null, hasKey ? null : 'Not configured']
                            .filter(Boolean)
                            .join(' · ')
                        : undefined,
                    trailing: custom ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Remove ${item.model ?? 'model'}`}
                        onClick={() => group.onRemove(idx)}
                      >
                        <Icon name="close" size="sm" />
                      </Button>
                    ) : undefined,
                  };
                })}
                value={keys}
                onValueChange={(next) => {
                  // One adjacent swap: the first differing index moved down one step.
                  const from = keys.findIndex((k, i) => k !== next[i]);
                  if (from >= 0) group.onMove(from, 1);
                }}
              />
              <CustomModelFields providers={providers} testing={group.testing} error={group.addError} onAdd={group.onAdd} />
            </div>
          </Dialog.Body>
        </Dialog.Content>
      ) : null}
    </Dialog>
  );
}
