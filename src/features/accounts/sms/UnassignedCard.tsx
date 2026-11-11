'use client';

import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ListRow, type ListRowAction } from '@/components/ds/ListRow/ListRow';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Select } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { DialogFrame, useDialogSubmit } from '@/features/accounts/detail/cards/DialogFrame';
import { useAccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import { ClosedToggleButton } from '@/features/accounts/list/AccountsSections';
import type { Account } from '@/lib/account.types';
import type { SmsLine } from '@/lib/sms.types';

import { assignLine, markLineNotMine, markLinesNotMine, undoLineNotMine, undoLinesNotMine } from './smsActions';
import { SmsCardHeader } from './SmsCardHeader';
import { groupUnassigned, lineText, senderGroupText, type UnassignedSender } from './smsModel';
import { useSmsRun } from './useSmsRun';

/** "Belongs to an account": files a line under an account the user already has. */
function BelongsDialog({ line, accounts, onClose, onSaved }: { line: SmsLine; accounts: readonly Account[]; onClose: () => void; onSaved: () => void }) {
  const [accountId, setAccountId] = React.useState('');
  const { pending, error, submit } = useDialogSubmit(onClose);
  const handle = () => {
    if (!accountId) return;
    void submit(async () => {
      const result = await assignLine(line.id, accountId);
      if (!result.success) return result.error.message;
      onSaved();
      return null;
    });
  };
  return (
    <DialogFrame
      title="Belongs to an account"
      description={lineText(line)}
      submitLabel="Save"
      onSubmit={handle}
      onClose={onClose}
      loading={pending}
      error={error}
      submitDisabled={!accountId}
    >
      <Select
        label="Account"
        placeholder="Pick one"
        searchable
        value={accountId}
        onValueChange={(v) => setAccountId(String(v))}
        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
      />
    </DialogFrame>
  );
}

/** Lines no account owns yet: grouped by sender, with the ones seen once or twice folded away at the end. */
export function UnassignedCard({ lines, accounts }: { lines: readonly SmsLine[]; accounts: readonly Account[] }) {
  const { run, refresh } = useSmsRun();
  const { open } = useAccountDialogs();
  const groups = React.useMemo(() => groupUnassigned(lines), [lines]);
  const [belonging, setBelonging] = React.useState<SmsLine | null>(null);
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(new Set());
  const [rareShowing, setRareShowing] = React.useState(false);
  const openAccounts = React.useMemo(() => accounts.filter((a) => !a.closedOn), [accounts]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const undo = async (ids: string[]) => {
    const result = await (ids.length === 1 ? undoLineNotMine(ids[0]) : undoLinesNotMine(ids));
    if (!result.success) showToast(result.error.message, { tone: 'danger' });
    refresh();
  };

  const notMine = async (ids: string[], what: string) => {
    const result = await run(() => (ids.length === 1 ? markLineNotMine(ids[0]) : markLinesNotMine(ids)));
    if (result.success) showToast(`Hidden ${what}`, { action: { label: 'Undo', onSelect: () => void undo(ids) }, duration: 10_000 });
  };

  const addAsAccount = (line: SmsLine) =>
    open(undefined, {
      onCreated: (account) => void run(() => assignLine(line.id, account.id)),
    });

  const lineRow = (line: SmsLine, nested = false) => (
    <ListRow
      key={line.id}
      wrap
      data-testid="sms-unassigned-row"
      className={nested ? 'pl-space-24' : undefined}
      title={
        <span className="flex flex-wrap items-center gap-space-8">
          <span>{line.provider}</span>
          {line.isNew ? (
            <Badge tone="info" size="sm">
              New
            </Badge>
          ) : null}
        </span>
      }
      subtitle={lineText(line)}
      actions={
        [
          { id: 'add', label: 'Add as account', onSelect: () => addAsAccount(line) },
          ...(openAccounts.length > 0 ? [{ id: 'belongs', label: 'Belongs to an account', onSelect: () => setBelonging(line) }] : []),
          { id: 'not-mine', label: 'Not mine', onSelect: () => void notMine([line.id], line.provider) },
        ] satisfies ListRowAction[]
      }
    />
  );

  const senderRow = (group: UnassignedSender) => {
    const showing = expanded.has(group.key);
    return (
      <React.Fragment key={group.key}>
        <ListRow
          wrap
          data-testid="sms-sender-group"
          title={group.provider}
          subtitle={
            <>
              <span className="block">{group.sender}</span>
              <span className="block">{senderGroupText(group)}</span>
            </>
          }
          trailing={<ClosedToggleButton showing={showing} onToggle={() => toggle(group.key)} />}
          actions={[{ id: 'not-mine', label: 'Not mine', onSelect: () => void notMine(group.lines.map((l) => l.id), `${group.provider} ${group.sender}`) }]}
        />
        {showing ? group.lines.map((l) => lineRow(l, true)) : null}
      </React.Fragment>
    );
  };

  return (
    <Card data-testid="sms-unassigned">
      <SmsCardHeader title="Not in FinanceOS" subtitle="Senders that no account of yours owns yet" />
      {groups.items.length === 0 && groups.rare.length === 0 ? (
        <Card.Empty>Nothing here</Card.Empty>
      ) : (
        groups.items.map((item) => (item.kind === 'line' ? lineRow(item.line) : senderRow(item)))
      )}
      {groups.rare.length > 0 ? (
        <>
          <SectionHeader
            variant="band"
            action={
              <span className="flex items-center gap-space-8">
                <Text variant="label" as="span">
                  <Button variant="link" size="sm" onClick={() => void notMine(groups.rare.map((l) => l.id), `${groups.rare.length} rarely seen senders`)}>
                    Not mine
                  </Button>
                </Text>
                <ClosedToggleButton showing={rareShowing} onToggle={() => setRareShowing((v) => !v)} />
              </span>
            }
          >
            {`Seen once or twice (${groups.rare.length})`}
          </SectionHeader>
          {rareShowing ? groups.rare.map((l) => lineRow(l)) : null}
        </>
      ) : null}
      {belonging ? <BelongsDialog line={belonging} accounts={openAccounts} onClose={() => setBelonging(null)} onSaved={refresh} /> : null}
    </Card>
  );
}
