export interface KindRow {
  key: string;
  label: string;
  description?: string;
}

export interface KindGroup {
  title: string;
  kinds: KindRow[];
}

/** Bills & EMIs card switches (the card also holds the days-before and send-hour pickers). Keys match the server's NotificationKind. */
export const BILLS_KINDS: KindRow[] = [
  { key: 'BILL_DUE_REMINDER', label: 'Bill due', description: 'Before the due date, on the days above.' },
  { key: 'BILL_OVERDUE', label: 'Bill overdue', description: 'Daily after the due date until marked paid.' },
  { key: 'EMI_DUE_REMINDER', label: 'EMI due' },
  { key: 'EMI_OVERDUE', label: 'EMI overdue', description: 'Once, then weekly.' },
  { key: 'LENDING_RETURN', label: 'Money due back', description: 'Lent or borrowed, on the expected date.' },
];

/** The other kind cards, in page order. The card title is the group. */
export const KIND_GROUPS: KindGroup[] = [
  {
    title: 'Statements',
    kinds: [
      { key: 'STATEMENT_RECEIVED', label: 'Statement arrived', description: 'The bill digest when a new statement lands.' },
      { key: 'STATEMENT_EXPECTED', label: 'Statement missing', description: 'When the next statement is late.' },
      { key: 'STATEMENT_REVIEW_DIGEST', label: 'Unreviewed after a statement', description: 'Transactions left to review in its period.' },
    ],
  },
  {
    title: 'Gmail & jobs',
    kinds: [
      { key: 'GMAIL_RECONNECT', label: 'Mailbox needs reconnecting' },
      { key: 'GMAIL_ATTENTION', label: 'Emails needing attention' },
      { key: 'JOB_FINISHED', label: 'Jobs finished or failed', description: 'Imports, reconcile and rule apply you started.' },
    ],
  },
  {
    title: 'Rewards',
    kinds: [
      { key: 'REWARD_MILESTONE', label: 'Milestone close or reached' },
      { key: 'REWARD_CAP', label: 'Cap reached', description: 'A rule or bucket used up its cap for the period.' },
    ],
  },
];

export const ALL_KIND_KEYS = [...BILLS_KINDS, ...KIND_GROUPS.flatMap((g) => g.kinds)].map((k) => k.key);
