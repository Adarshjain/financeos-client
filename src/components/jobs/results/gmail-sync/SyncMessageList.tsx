import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

import { MESSAGE_GROUPS, type MessageGroup } from '@/features/jobs/syncLabelsModel';
import type { SyncMessageResult } from '@/lib/types';

import { SyncMessageRow } from './SyncMessageRow';

function Group({ group, messages }: { group: MessageGroup; messages: SyncMessageResult[] }) {
  const [open, setOpen] = useState(group.defaultOpen);
  return (
    <div className="border border-slate-200/70 dark:border-slate-800 rounded-md overflow-hidden bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-200 hover:underline focus:outline-none"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
        <span>
          {group.title} ({messages.length})
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800/60 border-t border-slate-100 dark:border-slate-800/60">
          {messages.map((m) => (
            <SyncMessageRow key={m.ledgerId} message={m} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Every email processed in a sync run, grouped by outcome with problems first. */
export function SyncMessageList({ messages, truncated }: { messages: SyncMessageResult[]; truncated: number }) {
  if (messages.length === 0) return null;

  const grouped = new Set(MESSAGE_GROUPS.flatMap((g) => g.statuses));
  const groups: Array<{ group: MessageGroup; messages: SyncMessageResult[] }> = MESSAGE_GROUPS.map((group) => ({
    group,
    messages: messages.filter((m) => group.statuses.includes(m.status)),
  }));
  const other = messages.filter((m) => !grouped.has(m.status));
  if (other.length > 0) {
    groups.push({ group: { key: 'other', title: 'Other', statuses: [], defaultOpen: false }, messages: other });
  }

  return (
    <div className="space-y-1.5 pt-1">
      <span className="font-semibold text-slate-800 dark:text-slate-200 block">Emails in this run</span>
      {groups
        .filter((g) => g.messages.length > 0)
        .map((g) => (
          <Group key={g.group.key} group={g.group} messages={g.messages} />
        ))}
      {truncated > 0 && (
        <div className="text-2xs text-slate-500 italic">
          …and {truncated} more email{truncated === 1 ? '' : 's'} not listed
        </div>
      )}
    </div>
  );
}
