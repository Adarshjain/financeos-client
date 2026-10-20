'use client';

import React from 'react';

import { Banner, Button, Dialog, DialogBody, DialogContent, Icon, ListRow, Text } from '@/components/ds';
import type { RoutingOptionDto } from '@/lib/api/types';

import { CustomModelFields } from './CustomModelFields';
import { type ProviderOption } from './providers';
import type { RoutingGroupEditor } from './routingGroups';
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

  return (
    <Dialog open={group !== null} onOpenChange={(open) => !open && group && !group.saving && group.onCancel()}>
      {group ? (
        <DialogContent
          size="lg"
          dismissible={!group.saving}
          title={group.dto.displayName}
          description={group.dto.description}
          secondary={{ label: 'Cancel', disabled: group.saving, onSelect: group.onCancel }}
          primary={{
            label: 'Save',
            loading: group.saving,
            disabled: group.saving || group.testing || group.draft.length === 0,
            onSelect: group.onSave,
          }}
        >
          <DialogBody>
            <div className="flex flex-col gap-space-12">
              {error ? <Banner tone="danger">{error}</Banner> : null}
              <div>
                {group.draft.map((item, idx) => {
                  const custom = isCustomEntry(item);
                  const option = custom ? undefined : routingOptions.find((o) => o.id === item.optionId);
                  const hasKey = custom
                    ? providers.some((p) => p.id === (item.provider ?? '').toLowerCase() && p.hasKey)
                    : (option?.available ?? false);
                  const label = custom ? (item.model ?? '') : option?.label || item.optionId;
                  return (
                    <ListRow
                      key={draftEntryKey(item)}
                      leading={
                        <span className="flex items-center gap-space-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label={`Move ${label} up`}
                            disabled={idx === 0}
                            onClick={() => group.onMove(idx, -1)}
                          >
                            <Icon name="chevron-up" size="sm" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label={`Move ${label} down`}
                            disabled={idx === group.draft.length - 1}
                            onClick={() => group.onMove(idx, 1)}
                          >
                            <Icon name="chevron-down" size="sm" />
                          </Button>
                          <Text variant="label" tone="ink-3" mono>
                            #{idx + 1}
                          </Text>
                        </span>
                      }
                      title={
                        <Text variant="body-strong" as="span" tone={hasKey ? 'ink' : 'ink-3'} mono={custom}>
                          {label}
                        </Text>
                      }
                      subtitle={
                        custom || !hasKey
                          ? [custom ? providerName(item.provider) : null, hasKey ? null : 'Not configured']
                              .filter(Boolean)
                              .join(' · ')
                          : undefined
                      }
                      trailing={
                        custom ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            aria-label={`Remove ${item.model ?? 'model'}`}
                            onClick={() => group.onRemove(idx)}
                          >
                            <Icon name="close" size="sm" />
                          </Button>
                        ) : undefined
                      }
                    />
                  );
                })}
              </div>
              <CustomModelFields providers={providers} testing={group.testing} error={group.addError} onAdd={group.onAdd} />
            </div>
          </DialogBody>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
