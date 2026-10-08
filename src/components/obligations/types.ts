import type { ObligationItemDto } from '@/lib/api/types';

export type ObligationItem = ObligationItemDto;

export type ObligationType = 'emi' | 'lending_due' | 'card_bill' | 'statement_expected';

export type ObligationKindFilter = 'all' | ObligationType;
