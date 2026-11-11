/** Shapes of the SMS sync web endpoints (see the server's SmsDtos and the sms-sync API contract). Dates are yyyy-mm-dd, instants ISO strings. */

export interface SmsPairingCode {
  code: string;
  expiresAt: string;
}

export interface SmsDevice {
  id: string;
  name: string;
  pairedAt: string;
  lastSeenAt: string | null;
  lastSummaryAt: string | null;
  paused: boolean;
  revokedAt: string | null;
}

export type SmsLineState = 'OFF' | 'ON' | 'NOT_MINE';

export interface SmsLine {
  id: string;
  sender: string;
  provider: string;
  kind: string | null;
  ending: string | null;
  family: string | null;
  msgCount: number;
  txnCount: number;
  firstMsgAt: string | null;
  lastMsgAt: string | null;
  state: SmsLineState;
  syncFrom: string | null;
  isNew: boolean;
  accountId: string | null;
  suggestedAccountId: string | null;
}

export interface SmsLast60Days {
  statement: number;
  emailAlert: number;
  manual: number;
}

export interface SmsAccountLines {
  accountId: string;
  name: string;
  type: string;
  lastTransactionDate: string | null;
  last60Days: SmsLast60Days;
  lines: SmsLine[];
}

export interface SmsLines {
  accounts: SmsAccountLines[];
  unassigned: SmsLine[];
  notMine: SmsLine[];
}

export interface SmsReportAlert {
  kind: 'BALANCE_GAP' | 'SILENT_LINE' | 'COULD_NOT_READ';
  message: string;
  date: string | null;
}

export interface SmsReportAccount {
  accountId: string;
  name: string;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  wouldCreate: number;
  wouldAttach: number;
  created: number;
  attached: number;
  duplicates: number;
  needsConfirm: number;
  couldNotRead: number;
  alerts: SmsReportAlert[];
}

export interface SmsReport {
  postingEnabled: boolean;
  totals: {
    stored: number;
    read: number;
    needsConfirm: number;
    couldNotRead: number;
    ignored: number;
    wouldCreate: number;
    wouldAttach: number;
    created: number;
    attached: number;
    duplicates: number;
  };
  accounts: SmsReportAccount[];
}

export type SmsMessageStatus = 'NEEDS_CONFIRM' | 'COULD_NOT_READ' | 'READ' | 'IGNORED';

export interface SmsMessage {
  id: string;
  sender: string;
  provider: string | null;
  body: string;
  receivedAt: string;
  accountId: string | null;
  accountName: string | null;
  readStatus: SmsMessageStatus;
  kind: string | null;
  amount: number | null;
  direction: 'debit' | 'credit' | null;
  txnDate: string | null;
  counterparty: string | null;
  balanceAfter: number | null;
  refNo: string | null;
  outcome: string | null;
  transactionId: string | null;
}

export interface SmsMessagesPage {
  items: SmsMessage[];
  page: number;
  size: number;
  total: number;
}

export interface SmsConfirmBody {
  amount?: number;
  direction?: 'debit' | 'credit';
  txnDate?: string;
  counterparty?: string;
}
