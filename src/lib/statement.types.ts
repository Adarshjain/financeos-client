export type StatementSource = 'gmail' | 'file_upload';
export type StatementVerdict = 'AUTO_INGEST' | 'NEEDS_REVIEW' | 'REJECTED';
export type TransactionType = 'DEBIT' | 'CREDIT';
export type ReviewType = 'NEEDS_REVIEW' | 'AUTO_REVIEWED' | 'MANUALLY_REVIEWED' | 'NA';

export interface StatementSummary {
  id: string;
  source: StatementSource;
  sourceRef: string;
  statementType: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number | null;
  closingBalance: number | null;
  totalDebits: number | null;
  totalCredits: number | null;
  transactionCount: number;
  linesSkipped: number;
  parseMode: string | null;
  chainValidationPct: number | null;
  checksumOk: boolean;
  verdict: StatementVerdict;
  bankName: string | null;
  accountNumberMasked: string | null;
  createdAt: string;
}

export interface StatementCardDetails {
  totalAmountDue: number | null;
  minimumAmountDue: number | null;
  paymentDueDate: string | null;
  creditLimit: number | null;
  availableCreditLimit: number | null;
  financeCharges: number | null;
  feesAndCharges: number | null;
  previousBalance: number | null;
  paymentsReceived: number | null;
  totalPurchases: number | null;
  rewardPointsBalance: number | null;
  rewardPointsEarned: number | null;
}

export interface StatementLine {
  transactionId: string;
  lineIndex: number;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  reviewType: ReviewType;
  balanceAfter: number | null;
  chainValid: boolean | null;
}

export interface StatementDetail extends StatementSummary {
  cardDetails: StatementCardDetails | null;
  lines: StatementLine[];
}

export interface CardCycleHistoryItem {
  periodEnd: string | null;
  totalPurchases: number | null;
  paymentsReceived: number | null;
  financeCharges: number | null;
  feesAndCharges: number | null;
  rewardPointsBalance: number | null;
}

export interface CardCycleSummary {
  statementId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalAmountDue: number | null;
  minimumAmountDue: number | null;
  paymentDueDate: string | null;
  daysUntilDue: number | null;
  creditLimit: number | null;
  availableCreditLimit: number | null;
  utilizationPct: number | null;
  rewardPointsBalance: number | null;
  history: CardCycleHistoryItem[];
}
