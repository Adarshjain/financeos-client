import { SPRITE_IDS } from './bankSprite.generated';

/**
 * The banks and card issuers an account can belong to. Ids are the server's: it stores and
 * checks them, the client owns names and logos. Order is the order the dropdown shows.
 */
export interface Bank {
  id: string;
  name: string;
  /** The bank's short display name, such as "HDFC" or "BoB". */
  short_name: string;
  /** Short names people type, such as "SBI" or "HDFC", so search finds the bank by them. */
  aliases: string[];
  /** Cell of the bank's logo in the one sprite, public/banks/sprite.png. */
  spriteIndex: number;
}

const BANK_DATA: ReadonlyArray<Omit<Bank, 'spriteIndex'>> = [
  { id: 'amex',  short_name: 'AmEx', name: 'American Express', aliases: ['Amex'] },
  { id: 'au',  short_name: 'AU', name: 'AU Small Finance Bank', aliases: ['AU Bank'] },
  { id: 'axis',  short_name: 'Axis', name: 'Axis Bank', aliases: [] },
  { id: 'bank_of_baroda',  short_name: 'BoB', name: 'Bank of Baroda', aliases: [] },
  { id: 'canara',  short_name: 'Canara', name: 'Canara Bank', aliases: [] },
  { id: 'csb',  short_name: 'CSB Bank', name: 'CSB Bank', aliases: ['Catholic Syrian Bank'] },
  { id: 'equitas',  short_name: 'Equitas', name: 'Equitas Small Finance Bank', aliases: ['Equitas'] },
  { id: 'federal',  short_name: 'Federal', name: 'Federal Bank', aliases: [] },
  { id: 'hdfc',  short_name: 'HDFC', name: 'HDFC Bank', aliases: ['HDFC'] },
  { id: 'hsbc',  short_name: 'HSBC', name: 'HSBC', aliases: [] },
  { id: 'icici',  short_name: 'ICICI', name: 'ICICI Bank', aliases: ['ICICI'] },
  { id: 'idfc_first',  short_name: 'IDFC First', name: 'IDFC First Bank', aliases: ['IDFC FIRST', 'IDFC'] },
  { id: 'indian_bank',  short_name: 'Indian Bank', name: 'Indian Bank', aliases: [] },
  { id: 'indusind',  short_name: 'IndusInd', name: 'IndusInd Bank', aliases: ['IndusInd'] },
  { id: 'sbi',  short_name: 'SBI', name: 'State Bank of India', aliases: ['SBI Card', 'SBI'] },
  { id: 'sbm',  short_name: 'SBM', name: 'SBM Bank India', aliases: ['SBM Bank'] },
  { id: 'slice',  short_name: 'Slice', name: 'Slice Small Finance Bank', aliases: ['North East Small Finance Bank', 'slice'] },
  { id: 'unity',  short_name: 'Unity', name: 'Unity Small Finance Bank', aliases: ['Unity Bank'] },
  { id: 'yes',  short_name: 'Yes Bank', name: 'Yes Bank', aliases: [] },
];

export const BANKS: readonly Bank[] = BANK_DATA.map((b) => ({
  ...b,
  spriteIndex: (SPRITE_IDS as readonly string[]).indexOf(b.id),
}));

export function bankById(id: string | null | undefined): Bank | undefined {
  return id ? BANKS.find((b) => b.id === id) : undefined;
}
