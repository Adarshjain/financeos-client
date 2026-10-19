/**
 * The banks and card issuers an account can belong to. Ids are the server's: it stores and
 * checks them, the client owns names and logos. Order is the order the dropdown shows.
 */
export interface Bank {
  id: string;
  name: string;
  /** Short names people type, such as "SBI" or "HDFC", so search finds the bank by them. */
  aliases: string[];
  /** Path of the bank's icon under public/. */
  logo: string;
}

const BANK_DATA: ReadonlyArray<Omit<Bank, 'logo'>> = [
  { id: 'sbi', name: 'State Bank of India', aliases: ['SBI Card', 'SBI'] },
  { id: 'pnb', name: 'Punjab National Bank', aliases: ['PNB'] },
  { id: 'bank_of_baroda', name: 'Bank of Baroda', aliases: [] },
  { id: 'canara', name: 'Canara Bank', aliases: [] },
  { id: 'union_bank', name: 'Union Bank of India', aliases: ['Union Bank'] },
  { id: 'bank_of_india', name: 'Bank of India', aliases: [] },
  { id: 'indian_bank', name: 'Indian Bank', aliases: [] },
  { id: 'central_bank', name: 'Central Bank of India', aliases: [] },
  { id: 'iob', name: 'Indian Overseas Bank', aliases: ['IOB'] },
  { id: 'uco', name: 'UCO Bank', aliases: [] },
  { id: 'bank_of_maharashtra', name: 'Bank of Maharashtra', aliases: [] },
  {
    id: 'punjab_sind',
    name: 'Punjab & Sind Bank',
    aliases: ['Punjab and Sind Bank'],
  },
  { id: 'hdfc', name: 'HDFC Bank', aliases: ['HDFC'] },
  { id: 'icici', name: 'ICICI Bank', aliases: ['ICICI'] },
  { id: 'axis', name: 'Axis Bank', aliases: [] },
  { id: 'kotak', name: 'Kotak Mahindra Bank', aliases: ['Kotak'] },
  { id: 'indusind', name: 'IndusInd Bank', aliases: ['IndusInd'] },
  { id: 'yes', name: 'Yes Bank', aliases: [] },
  {
    id: 'idfc_first',
    name: 'IDFC First Bank',
    aliases: ['IDFC FIRST', 'IDFC'],
  },
  { id: 'federal', name: 'Federal Bank', aliases: [] },
  { id: 'rbl', name: 'RBL Bank', aliases: ['RBL'] },
  { id: 'bandhan', name: 'Bandhan Bank', aliases: [] },
  { id: 'idbi', name: 'IDBI Bank', aliases: ['IDBI'] },
  { id: 'csb', name: 'CSB Bank', aliases: ['Catholic Syrian Bank'] },
  { id: 'city_union', name: 'City Union Bank', aliases: [] },
  { id: 'dcb', name: 'DCB Bank', aliases: [] },
  { id: 'dhanlaxmi', name: 'Dhanlaxmi Bank', aliases: [] },
  {
    id: 'jk_bank',
    name: 'J&K Bank',
    aliases: ['Jammu & Kashmir Bank', 'Jammu and Kashmir Bank'],
  },
  { id: 'karnataka', name: 'Karnataka Bank', aliases: [] },
  { id: 'karur_vysya', name: 'Karur Vysya Bank', aliases: ['KVB'] },
  { id: 'nainital', name: 'Nainital Bank', aliases: [] },
  { id: 'south_indian', name: 'South Indian Bank', aliases: [] },
  { id: 'tmb', name: 'Tamilnad Mercantile Bank', aliases: ['TMB'] },
  { id: 'au', name: 'AU Small Finance Bank', aliases: ['AU Bank'] },
  { id: 'equitas', name: 'Equitas Small Finance Bank', aliases: ['Equitas'] },
  { id: 'ujjivan', name: 'Ujjivan Small Finance Bank', aliases: ['Ujjivan'] },
  { id: 'jana', name: 'Jana Small Finance Bank', aliases: ['Jana Bank'] },
  {
    id: 'suryoday',
    name: 'Suryoday Small Finance Bank',
    aliases: ['Suryoday'],
  },
  { id: 'esaf', name: 'ESAF Small Finance Bank', aliases: ['ESAF'] },
  { id: 'utkarsh', name: 'Utkarsh Small Finance Bank', aliases: ['Utkarsh'] },
  {
    id: 'slice',
    name: 'slice Small Finance Bank',
    aliases: ['North East Small Finance Bank', 'slice'],
  },
  { id: 'capital', name: 'Capital Small Finance Bank', aliases: [] },
  { id: 'unity', name: 'Unity Small Finance Bank', aliases: ['Unity Bank'] },
  {
    id: 'shivalik',
    name: 'Shivalik Small Finance Bank',
    aliases: ['Shivalik'],
  },
  { id: 'airtel_payments', name: 'Airtel Payments Bank', aliases: [] },
  { id: 'ippb', name: 'India Post Payments Bank', aliases: ['IPPB'] },
  { id: 'fino', name: 'Fino Payments Bank', aliases: ['Fino Bank'] },
  { id: 'jio_payments', name: 'Jio Payments Bank', aliases: [] },
  { id: 'paytm_payments', name: 'Paytm Payments Bank', aliases: [] },
  { id: 'nsdl_payments', name: 'NSDL Payments Bank', aliases: [] },
  { id: 'amex', name: 'American Express', aliases: ['Amex'] },
  { id: 'standard_chartered', name: 'Standard Chartered', aliases: [] },
  { id: 'hsbc', name: 'HSBC', aliases: [] },
  { id: 'dbs', name: 'DBS Bank', aliases: ['digibank by DBS', 'DBS'] },
  { id: 'citi', name: 'Citibank', aliases: ['Citi'] },
  { id: 'deutsche', name: 'Deutsche Bank', aliases: [] },
  { id: 'sbm', name: 'SBM Bank India', aliases: ['SBM Bank'] },
  { id: 'bobcard', name: 'BOBCARD', aliases: ['BOB Card', 'BOB Financial'] },
];

export const BANKS: readonly Bank[] = BANK_DATA.map((b) => ({
  ...b,
  logo: `/banks/${b.id}.png`,
}));

export function bankById(id: string | null | undefined): Bank | undefined {
  return id ? BANKS.find((b) => b.id === id) : undefined;
}
