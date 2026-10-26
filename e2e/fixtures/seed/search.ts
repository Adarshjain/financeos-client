import type { ApiClient } from '../api';
import { createBankAccount, createCreditCard } from './accounts';
import { addLending, createCounterparty, createLoan } from './loans';
import { createDashboard, createReport } from './reports';
import { createTransaction, todayString } from './transactions';

export interface SeededSearch {
  /** The one word every seeded record carries. */
  word: string;
  card: { id: string; name: string };
  loan: { id: string; name: string };
  report: { id: string; name: string };
  dashboard: { id: string; name: string };
  person: { id: string; name: string };
}

/** One record per search group, all named with `word`, plus `transactions` debits whose description has it too. */
export async function seedSearch(api: ApiClient, word: string, transactions = 7): Promise<SeededSearch> {
  const card = await createCreditCard(api, { name: `${word} Card`, last4: '7741', issuer: 'HDFC', productName: word });
  const bank = await createBankAccount(api, { name: `${word} Savings`, last4: '2210' });
  for (let i = 1; i <= transactions; i++) {
    await createTransaction(api, bank.id, {
      description: `${word} purchase ${i}`,
      amount: -(1000 + i),
      date: todayString(-i),
    });
  }
  const person = await createCounterparty(api, { name: `${word} Rahul` });
  await addLending(api, { counterpartyId: person.id, direction: 'lent', amount: 5000 });
  const loan = await createLoan(api, { name: `${word} loan`, lender: 'SBI' });
  const report = await createReport(api, {
    name: `${word} spend`,
    type: 'KPI',
    datasource: 'transactions',
    definition: { measure: 'amount', aggregation: 'sum', filters: [] },
  });
  const dashboard = await createDashboard(api, { name: `${word} board`, widgets: [] });
  return {
    word,
    card: { id: card.id, name: card.name },
    loan: { id: loan.id, name: loan.name },
    report: { id: report.id, name: report.name },
    dashboard: { id: dashboard.id, name: dashboard.name },
    person: { id: person.id, name: person.name },
  };
}
