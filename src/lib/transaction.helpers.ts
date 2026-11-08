export type LinkType = 'TRANSFER' | 'CC_PAYMENT' | 'REFUND' | 'REVERSAL' | 'FEE' | 'EMI';

/** Runtime companion to `LinkType`, for callers that need to enumerate the union. */
export const LINK_TYPES: LinkType[] = [
  'TRANSFER',
  'CC_PAYMENT',
  'REFUND',
  'REVERSAL',
  'FEE',
  'EMI',
];

/**
 * Derive the human-facing role label for a transaction link member
 * based on the link type and whether the member is the anchor.
 */
export function getDerivedRoleLabel(type: LinkType, isAnchor: boolean): string {
  switch (type) {
    case 'TRANSFER':
      return isAnchor ? 'Transfer out' : 'Transfer in';
    case 'CC_PAYMENT':
      return isAnchor ? 'Card bill payment' : 'Payment credited';
    case 'REFUND':
      return isAnchor ? 'Refunded purchase' : 'Refund';
    case 'REVERSAL':
      return isAnchor ? 'Reversed' : 'Reversal';
    case 'FEE':
      return isAnchor ? 'Parent charge' : 'Fee';
    case 'EMI':
      return isAnchor ? 'Purchase (EMI)' : 'Installment';
    default:
      return isAnchor ? 'Parent' : 'Counterpart';
  }
}

