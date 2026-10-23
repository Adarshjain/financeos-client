import type { ApiClient } from '../api';
import { istToday } from '../dates';
import { createBankAccount } from './accounts';
import {
  createBroker,
  createDividend,
  generateIsin,
  generateYahooSymbol,
  linkDividendTransaction,
  resolveInstrument,
  trade,
  uniqueSeedSuffix,
} from './investments';
import { createTransaction } from './transactions';

/** How a bank credit for a company reads in the statement. */
export const creditText = (name: string) => `ACH C- ${name} DIVIDEND`;

export interface SeededHolding {
  id: string;
  symbol: string;
  name: string;
}

export interface SeededDividends {
  broker: { id: string; name: string };
  bank: { id: string; name: string };
  /** Paid 20 days ago, ₹1,000 gross, linked to a ₹900 credit (so ₹100 short: the TDS hint). */
  received: SeededHolding & { dividendId: string; creditDescription: string };
  /** Paid 40 days ago, ₹1,000, the bank data covers it and nothing arrived. */
  overdue: SeededHolding & { dividendId: string };
  /** Paid today, ₹110, unlinked. */
  awaiting: SeededHolding & { dividendId: string };
  /** Awaiting dividend of ₹1,000 with a ₹900 credit in the bank that could be it (a match for Find matches). */
  matchable: SeededHolding & { dividendId: string; creditDescription: string };
  /** Held with no dividend recorded, and a ₹500 credit that looks like one. */
  unrecorded: SeededHolding & { creditDescription: string };
  /** A credit that looks like a dividend and names no holding. */
  strayCreditDescription: string;
  /** RELIANCE.NS held since 2024: the stubbed Yahoo events give Suggestions something to find. */
  reliance: SeededHolding;
}

async function stock(api: ApiClient, broker: { id: string }, label: string): Promise<SeededHolding> {
  const suffix = uniqueSeedSuffix();
  const symbol = `${label}${suffix}`.slice(0, 12);
  const name = `${label} Zorvex ${suffix} Industries`;
  const inst = await resolveInstrument(api, {
    type: 'stock',
    name,
    isin: generateIsin(),
    symbol,
    exchange: 'NSE',
    yahooSymbol: generateYahooSymbol(label),
  });
  await trade(api, { brokerAccountId: broker.id, instrumentId: inst.id, type: 'buy', quantity: 100, price: 50, tradeDate: istToday(-400) });
  return { id: inst.id, symbol, name };
}

/**
 * A broker with five held stocks and a bank account: one payout received (linked), one overdue, one awaiting,
 * one that a credit in the bank could match, and one held stock whose credit is not recorded as a dividend.
 */
export async function seedDividends(api: ApiClient): Promise<SeededDividends> {
  const broker = await createBroker(api);
  const bank = await createBankAccount(api, { name: 'Receipts Bank' });
  // Bank data through 5 days ago, so the 40-day-old payout is overdue (its window closed with data covering it).
  await createTransaction(api, bank.id, { amount: 50, date: istToday(-5), description: 'Misc credit' });

  const received = await stock(api, broker, 'RCVD');
  const receivedDividend = await createDividend(api, { brokerAccountId: broker.id, instrumentId: received.id, type: 'dividend', amount: 1000, perUnit: 10, payDate: istToday(-20) });
  const receivedCredit = creditText(received.name);
  const credit = await createTransaction(api, bank.id, { amount: 900, date: istToday(-20), description: receivedCredit });
  await linkDividendTransaction(api, receivedDividend.id, credit.id);

  const overdue = await stock(api, broker, 'OVRD');
  const overdueDividend = await createDividend(api, { brokerAccountId: broker.id, instrumentId: overdue.id, type: 'dividend', amount: 1000, perUnit: 10, payDate: istToday(-40) });

  const awaiting = await stock(api, broker, 'WAIT');
  const awaitingDividend = await createDividend(api, { brokerAccountId: broker.id, instrumentId: awaiting.id, type: 'dividend', amount: 110, perUnit: 1.1, payDate: istToday() });

  const matchable = await stock(api, broker, 'MTCH');
  const matchableDividend = await createDividend(api, { brokerAccountId: broker.id, instrumentId: matchable.id, type: 'dividend', amount: 1000, perUnit: 10, payDate: istToday(-10) });
  const matchableCredit = creditText(matchable.name);
  await createTransaction(api, bank.id, { amount: 900, date: istToday(-10), description: matchableCredit });

  const unrecorded = await stock(api, broker, 'UNRC');
  const unrecordedCredit = creditText(unrecorded.name);
  await createTransaction(api, bank.id, { amount: 500, date: istToday(-3), description: unrecordedCredit });

  const strayCreditDescription = `NACH CR STRAY DIV ${uniqueSeedSuffix()}`;
  await createTransaction(api, bank.id, { amount: 415, date: istToday(-4), description: strayCreditDescription });

  const relianceInstrument = await resolveInstrument(api, {
    type: 'stock',
    name: 'Reliance Industries Limited',
    symbol: 'RELIANCE.NS',
    exchange: 'NSE',
    yahooSymbol: 'RELIANCE.NS',
  });
  await trade(api, { brokerAccountId: broker.id, instrumentId: relianceInstrument.id, type: 'buy', quantity: 50, price: 2000, tradeDate: '2024-01-01' });

  return {
    broker: { id: broker.id, name: broker.name },
    bank: { id: bank.id, name: 'Receipts Bank' },
    received: { ...received, dividendId: receivedDividend.id, creditDescription: receivedCredit },
    overdue: { ...overdue, dividendId: overdueDividend.id },
    awaiting: { ...awaiting, dividendId: awaitingDividend.id },
    matchable: { ...matchable, dividendId: matchableDividend.id, creditDescription: matchableCredit },
    unrecorded: { ...unrecorded, creditDescription: unrecordedCredit },
    strayCreditDescription,
    reliance: { id: relianceInstrument.id, symbol: 'RELIANCE.NS', name: 'Reliance Industries Limited' },
  };
}
