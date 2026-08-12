export type LendingDirection = 'lent' | 'borrowed';

export interface CreateCounterpartyRequest {
  name: string;
  notes?: string;
}

export interface UpdateCounterpartyRequest {
  name?: string;
  notes?: string;
}

export interface CounterpartyResponse {
  id: string;
  name: string;
  notes?: string;
  totalLent: number;
  totalBorrowed: number;
  netPosition: number;
  entryCount: number;
}

export interface CreateLendingRequest {
  counterpartyId?: string;
  newCounterpartyName?: string;
  direction: LendingDirection;
  amount: number;
  entryDate: string;
  expectedReturnDate?: string;
  transactionId?: string;
  notes?: string;
}

export interface UpdateLendingRequest {
  direction?: LendingDirection;
  amount?: number;
  entryDate?: string;
  expectedReturnDate?: string;
  notes?: string;
}

export interface LendingResponse {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  direction: LendingDirection;
  amount: number;
  entryDate: string;
  expectedReturnDate?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface ObligationItemDto {
  type: 'emi' | 'lending_due';
  date: string;
  amount: number;
  status: 'upcoming' | 'overdue';
  loanId?: string;
  loanName?: string;
  installmentSeq?: number;
  lendingId?: string;
  counterpartyId?: string;
  counterpartyName?: string;
  direction?: LendingDirection;
}

export interface ObligationsResponse {
  items: ObligationItemDto[];
}
