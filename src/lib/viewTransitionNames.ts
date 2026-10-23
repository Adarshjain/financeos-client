/** The shared view-transition names of a row and the detail it grows into (unique per page). */
export const transitionName = {
  account: (id: string) => `account-${id}`,
  loan: (id: string) => `loan-${id}`,
  person: (id: string) => `person-${id}`,
  transactionTitle: (id: string) => `transaction-title-${id}`,
  transactionAmount: (id: string) => `transaction-amount-${id}`,
};
