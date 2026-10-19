import { SPRITE_IDS } from './bankSprite.generated';

/**
 * The banks and card issuers an account can belong to. Ids are the server's: it stores and
 * checks them, the client owns names and logos. Order is the order the dropdown shows.
 */
export interface Bank {
  id: string;
  name: string;
  /** Short names people type, such as "SBI" or "HDFC", so search finds the bank by them. */
  aliases: string[];
  /** Cell of the bank's logo in the one sprite, public/banks/sprite.png. */
  spriteIndex: number;
}

const BANK_DATA: ReadonlyArray<Omit<Bank, 'spriteIndex'>> = [
  { id: 'amex', name: 'American Express', aliases: ['Amex'] },
  { id: 'au', name: 'AU Small Finance Bank', aliases: ['AU Bank'] },
  { id: 'axis', name: 'Axis Bank', aliases: [] },
  { id: 'bank_of_baroda', name: 'Bank of Baroda', aliases: [] },
  { id: 'canara', name: 'Canara Bank', aliases: [] },
  { id: 'csb', name: 'CSB Bank', aliases: ['Catholic Syrian Bank'] },
  { id: 'equitas', name: 'Equitas Small Finance Bank', aliases: ['Equitas'] },
  { id: 'federal', name: 'Federal Bank', aliases: [] },
  { id: 'hdfc', name: 'HDFC Bank', aliases: ['HDFC'] },
  { id: 'hsbc', name: 'HSBC', aliases: [] },
  { id: 'icici', name: 'ICICI Bank', aliases: ['ICICI'] },
  { id: 'idfc_first', name: 'IDFC First Bank', aliases: ['IDFC FIRST', 'IDFC'] },
  { id: 'indian_bank', name: 'Indian Bank', aliases: [] },
  { id: 'indusind', name: 'IndusInd Bank', aliases: ['IndusInd'] },
  { id: 'sbi', name: 'State Bank of India', aliases: ['SBI Card', 'SBI'] },
  { id: 'sbm', name: 'SBM Bank India', aliases: ['SBM Bank'] },
  { id: 'slice', name: 'slice Small Finance Bank', aliases: ['North East Small Finance Bank', 'slice'] },
  { id: 'unity', name: 'Unity Small Finance Bank', aliases: ['Unity Bank'] },
  { id: 'yes', name: 'Yes Bank', aliases: [] },
];

export const BANKS: readonly Bank[] = BANK_DATA.map((b) => ({
  ...b,
  spriteIndex: (SPRITE_IDS as readonly string[]).indexOf(b.id),
}));

export function bankById(id: string | null | undefined): Bank | undefined {
  return id ? BANKS.find((b) => b.id === id) : undefined;
}
