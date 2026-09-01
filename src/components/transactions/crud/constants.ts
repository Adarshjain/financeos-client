import { TransactionChannel } from '@/lib/transaction.types';

export const CHANNEL_LABELS: Record<TransactionChannel, string> = {
  ONLINE: 'Online',
  POS: 'POS / In-store',
  UPI: 'UPI',
  CONTACTLESS: 'Contactless / Tap',
  ATM: 'ATM',
  OTHER: 'Other',
};
