'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { appHref } from '@/features/shell/routes';
import type { IgnoredNumber, ImportOffGroup, UnknownNumberGroup } from '@/lib/api/types';

import { ignoredDetail, importOffDetail, numberDetail, numberTitle, suggestionLine } from './attentionItemModel';
import { EditAccountHint } from './EditAccountHint';

/** One unknown number: what it is and how much mail it holds, the account it seems to belong to, "Add to account", and Ignore in the ⋯ menu. */
export function UnknownNumberRow({
  group,
  onAdd,
  onIgnore,
  onDetails,
}: {
  group: UnknownNumberGroup;
  onAdd: (group: UnknownNumberGroup) => void;
  onIgnore: (group: UnknownNumberGroup) => void;
  onDetails: (group: UnknownNumberGroup) => void;
}) {
  const match = suggestionLine(group);
  return (
    <ListRow
      wrap
      data-testid="attention-number"
      title={numberTitle(group)}
      subtitle={
        <>
          <div>{numberDetail(group)}</div>
          {match ? <div>{match}</div> : null}
          <div>
            <Text variant="label" as="span">
              <Button variant="link" size="sm" onClick={() => onDetails(group)}>
                Details
              </Button>
            </Text>
          </div>
        </>
      }
      trailing={
        <Button variant="secondary" size="sm" onClick={() => onAdd(group)}>
          Add to account
        </Button>
      }
      actions={[{ id: 'ignore', label: 'Ignore this number', onSelect: () => onIgnore(group) }]}
    />
  );
}

/** An open account whose Gmail mail is waiting because import is off; the same Edit-account step the per-email row used. */
export function ImportOffRow({ group }: { group: ImportOffGroup }) {
  return (
    <ListRow
      wrap
      data-testid="attention-import-off"
      title={`Gmail import is off for ${group.accountName}`}
      subtitle={importOffDetail(group)}
      trailing={<EditAccountHint accountId={group.accountId} focusField="ingestFromDate" label="Set import date" href={appHref(`/accounts/${group.accountId}`)} />}
    />
  );
}

/** A number the user chose to ignore, with the way back. */
export function IgnoredNumberRow({ row, onStop }: { row: IgnoredNumber; onStop: (row: IgnoredNumber) => void }) {
  return (
    <ListRow
      wrap
      data-testid="attention-ignored"
      title={numberTitle(row)}
      subtitle={ignoredDetail(row)}
      trailing={
        <Button variant="secondary" size="sm" onClick={() => onStop(row)}>
          Stop ignoring
        </Button>
      }
    />
  );
}
