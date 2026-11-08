'use client';

import React from 'react';

import { Select } from '@/components/ds/Select/Select';
import { TextField } from '@/components/ds/TextField/TextField';
import { OldCardFields } from '@/features/accounts/cards/OldCardFields';
import { useOldCard } from '@/features/accounts/cards/useOldCard';
import { DialogFrame, useDialogSubmit } from '@/features/accounts/detail/cards/DialogFrame';
import { RELATIONSHIP_OPTIONS } from '@/features/accounts/detail/cards/HolderFormDialogs';
import type { Account } from '@/lib/account.types';
import type { Schemas } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';

import { saveBelongs } from './suggestionActions';
import { fittingAccounts, sectionOfKind, type SuggestionRow } from './suggestionsModel';

type BelongsAs = Schemas['BelongsRequest']['as'];

const CARD_OPTIONS: { value: BelongsAs; label: string; description?: string }[] = [
  { value: 'OLDER_NUMBER', label: 'An older number of this card', description: 'Saved as a closed card. Old mail and statements land here.' },
  { value: 'ADDON', label: 'An add-on card', description: 'Asks who holds it' },
  { value: 'OPEN_CARD', label: 'Another card of mine on this account', description: 'Saved as an open card under you' },
];

const BANK_OPTIONS: { value: BelongsAs; label: string; description?: string }[] = [
  { value: 'OLDER_NUMBER', label: 'An old debit card', description: 'Saved as a closed card. Old mail lands here.' },
  { value: 'DEBIT_CARD', label: 'A debit card on this account' },
  { value: 'ALIAS', label: 'The same account (another number for it)' },
];

/** "Where does ••NNNN belong?": files a suggestion's number under an account the user already has. */
export function SuggestionBelongsDialog({
  row,
  accounts,
  onClose,
  onSaved,
}: {
  row: SuggestionRow;
  /** The accounts of the row's section; the dialog lists the ones at the row's bank. */
  accounts: readonly Account[];
  onClose: () => void;
  onSaved: (account: Account) => void;
}) {
  const fitting = React.useMemo(() => fittingAccounts(row, accounts), [row, accounts]);
  const isCard = sectionOfKind(row.kind) === 'card';
  const bankName = row.item?.bank.name ?? 'this bank';
  const [accountId, setAccountId] = React.useState(() => (fitting.some((a) => a.id === row.parentAccountId) ? (row.parentAccountId ?? '') : ''));
  const [as, setAs] = React.useState<BelongsAs | ''>('');
  const [relationship, setRelationship] = React.useState('');
  const [holderName, setHolderName] = React.useState('');
  const [oldCardErrors, setOldCardErrors] = React.useState<Record<string, string>>({});
  const { pending, error, submit } = useDialogSubmit(onClose);
  const today = todayInAppZone();
  const older = as === 'OLDER_NUMBER';
  const oldCard = useOldCard({
    accountId: older && accountId ? accountId : null,
    last4: row.last4 && row.last4.length === 4 ? row.last4 : null,
    isBank: !isCard,
    today,
    fallback: { firstSeen: row.item?.firstSeenOn, lastSeen: row.item?.lastSeenOn },
  });

  const ready = !!accountId && !!as && (as !== 'ADDON' || !!relationship);

  const handle = () => {
    if (!ready || !as) return;
    const body: Schemas['BelongsRequest'] = { accountId, as };
    if (as === 'ADDON') {
      body.relationship = relationship as Schemas['BelongsRequest']['relationship'];
      if (holderName.trim()) body.holderName = holderName.trim();
    }
    if (as === 'OLDER_NUMBER') {
      const built = oldCard.build();
      if (!built.ok) {
        setOldCardErrors(built.errors);
        return;
      }
      setOldCardErrors({});
      body.pastCard = built.body;
    }
    void submit(async () => {
      const result = await saveBelongs(row.id, body);
      if (!result.success) return result.error.message;
      const account = fitting.find((a) => a.id === accountId);
      if (account) onSaved(account);
      return null;
    });
  };

  const subtitle = [row.name, row.item?.caption].filter((part) => part && part.trim()).join(' · ');

  return (
    <DialogFrame
      title={`Where does ${row.last4 ? `••${row.last4}` : 'this'} belong?`}
      description={subtitle}
      submitLabel="Save"
      onSubmit={handle}
      onClose={onClose}
      loading={pending}
      error={error}
      submitDisabled={!ready}
    >
      <Select
        label="Account"
        placeholder="Pick one"
        value={accountId}
        onValueChange={(v) => setAccountId(String(v))}
        options={fitting.map((a) => ({ value: a.id, label: a.name }))}
        helper={`Only accounts at ${bankName} are listed.`}
      />
      <Select
        label="It's"
        placeholder="Pick one"
        value={as}
        onValueChange={(v) => setAs(String(v) as BelongsAs)}
        options={isCard ? CARD_OPTIONS : BANK_OPTIONS}
      />
      {older && accountId ? <OldCardFields state={oldCard} today={today} errors={oldCardErrors} disabled={pending} /> : null}
      {as === 'ADDON' ? (
        <>
          <Select label="Relationship" placeholder="Pick one" value={relationship} onValueChange={(v) => setRelationship(String(v))} options={RELATIONSHIP_OPTIONS} />
          <TextField label="Holder name" optional value={holderName} onValueChange={setHolderName} />
        </>
      ) : null}
    </DialogFrame>
  );
}
