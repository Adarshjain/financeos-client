/** A balance as the API serves it: a number, or a decimal string (opening balances). */
type Amount = number | string | null | undefined;

function amount(value: Amount): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The balances of a section's accounts added up (the accounts page section headers). An account
 * with no calculated balance counts its opening balance, as its tile shows; one with neither counts
 * nothing.
 */
export function sumBalances(accounts: readonly { balance?: Amount; openingBalance?: Amount }[]): number {
  return accounts.reduce((sum, account) => sum + amount(account.balance ?? account.openingBalance), 0);
}
