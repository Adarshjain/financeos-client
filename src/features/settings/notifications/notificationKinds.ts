export interface KindRow {
  key: string;
  label: string;
  description?: string;
}

export interface KindBand {
  title: string;
  kinds: KindRow[];
}

/** The switch rows of "What to tell me about", in board order. Keys match the server's NotificationKind. */
export const KIND_BANDS: KindBand[] = [
  {
    title: 'Credit cards',
    kinds: [
      { key: 'STATEMENT_RECEIVED', label: 'Statement arrived', description: 'The bill digest when a new statement lands' },
      { key: 'BILL_DUE_REMINDER', label: 'Bill due reminders', description: 'Before the due date, on the days above' },
      { key: 'BILL_OVERDUE', label: 'Bill overdue', description: 'Daily after the due date until marked paid' },
      { key: 'STATEMENT_EXPECTED', label: 'Statement missing', description: 'When the next statement is late' },
      { key: 'STATEMENT_REVIEW_DIGEST', label: 'Unreconciled after a statement', description: 'Transactions left to review in its period' },
    ],
  },
  {
    title: 'Loans & lendings',
    kinds: [
      { key: 'EMI_DUE_REMINDER', label: 'EMI due reminders' },
      { key: 'EMI_OVERDUE', label: 'EMI overdue', description: 'Once, then weekly' },
      { key: 'LENDING_RETURN', label: 'Money due back', description: 'Lent or borrowed, on the expected date' },
    ],
  },
  {
    title: 'Rewards',
    kinds: [
      { key: 'REWARD_MILESTONE', label: 'Milestone close or reached' },
      { key: 'REWARD_CAP', label: 'Cap reached', description: 'A rule or bucket used up its cap for the period' },
    ],
  },
  {
    title: 'Gmail & imports',
    kinds: [
      { key: 'GMAIL_RECONNECT', label: 'Mailbox needs reconnecting' },
      { key: 'GMAIL_ATTENTION', label: 'Emails needing attention' },
      { key: 'JOB_FINISHED', label: 'Job finished or failed', description: 'Imports, reconcile and rule apply you started' },
    ],
  },
];
