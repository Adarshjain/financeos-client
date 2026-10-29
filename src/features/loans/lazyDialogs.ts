// Loader of the loan form, shared so it is cached once for every screen that adds a loan (see useLazyDialog).
export const loadLoanFormDialog = () => import('./form/LoanFormDialog').then((m) => m.LoanFormDialog);
