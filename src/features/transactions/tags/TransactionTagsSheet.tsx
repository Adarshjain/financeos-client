'use client';

import React from 'react';

import { TagSheet } from '@/components/organisms/TagSheet/TagSheet';
import type { Account } from '@/lib/account.types';
import { formatMoney } from '@/lib/format';
import { useTags } from '@/lib/query/hooks/useTags';
import type { Tag } from '@/lib/tags.types';
import type { Transaction } from '@/lib/transaction.types';
import { absAmount } from '@/lib/transactionAmount';

import { sameIds, transactionsWord } from './tagsModel';
import { tagErrorMessage, useTagMutations } from './useTagMutations';
import { useTransactionTags } from './useTransactionTags';

const NO_TAGS: Tag[] = [];

export interface TransactionTagsSheetProps {
  /** The transactions the sheet is for. */
  transactions: Transaction[];
  /** `replace` (one transaction): its tags are ticked and the ticks replace them. `add` (the selection): the ticked tags are added to every one. */
  mode?: 'replace' | 'add';
  accounts: readonly Account[] | null;
  /** The sheet closed: after Done, or dismissed. The ticks are saved first when they changed. */
  onClose: () => void;
  /** Several rows got tags: the selection can go. */
  onAdded?: () => void;
}

/** The tag sheet over one transaction or the selection. Closing it saves what was ticked. */
export function TransactionTagsSheet({ transactions, mode = 'replace', accounts, onClose, onAdded }: TransactionTagsSheetProps) {
  const single = mode === 'replace' && transactions.length === 1 ? transactions[0] : null;
  const { data: all = NO_TAGS } = useTags();
  const { setTags, addTags } = useTransactionTags(accounts);
  const [ticked, setTicked] = React.useState<string[]>(() => (single?.tags ?? []).map((t) => t.id));
  const opened = React.useRef(ticked);
  // Tags made in the sheet are ticked before the tag list has been read again.
  const created = React.useRef<Tag[]>([]);
  const mutations = useTagMutations({
    quietRename: true,
    onCreated: (tag) => {
      created.current.push(tag);
      setTicked((now) => [...now, tag.id]);
    },
    onDeleted: (tag) => {
      setTicked((now) => now.filter((id) => id !== tag.id));
      opened.current = opened.current.filter((id) => id !== tag.id);
    },
  });

  const close = (open: boolean) => {
    if (open) return;
    onClose();
    const chosen = ticked.map((id) => all.find((t) => t.id === id) ?? created.current.find((t) => t.id === id)).filter((t): t is Tag => t !== undefined);
    if (single) {
      if (!sameIds(ticked, opened.current)) void setTags(single, chosen);
    } else if (chosen.length > 0) {
      void addTags(transactions, chosen).then((ok) => ok && onAdded?.());
    }
  };

  const first = single?.description || single?.sourcedDescription || '';
  const subtitle = single
    ? [first, formatMoney(absAmount(single.amount), { decimals: 'exact' })].filter(Boolean).join(' · ')
    : transactionsWord(transactions.length);

  return (
    <TagSheet
      open
      onOpenChange={close}
      tags={all}
      value={ticked}
      onValueChange={setTicked}
      subtitle={subtitle}
      onCreate={(name) => mutations.create.mutate(name)}
      creating={mutations.create.isPending}
      onRename={async (tag, name) => {
        try {
          await mutations.rename.mutateAsync({ tag, name });
        } catch (e) {
          throw new Error(tagErrorMessage(e, "Couldn't rename the tag. Try again."));
        }
      }}
      onDelete={(tag) => mutations.remove.mutate(tag)}
      managing={mutations.rename.isPending || mutations.remove.isPending}
    />
  );
}
