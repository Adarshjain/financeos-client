import type { EpfEmployer, EpfEntry, EpfSummary } from './epfModel';

/** Northwind Labs, the current employer. */
export function employer(overrides: Partial<EpfEmployer> = {}): EpfEmployer {
  return {
    id: 'e1',
    name: 'Northwind Labs',
    memberId: 'MHBAN0012345000067890',
    establishmentId: null,
    uan: '100200304321',
    joinedOn: '2023-09-01',
    leftOn: null,
    status: 'CURRENT',
    statusDate: null,
    balance: 843210,
    employeeBalance: 460110,
    employerBalance: 383100,
    pensionWithdrawn: false,
    ...overrides,
  };
}

export const transferred = () =>
  employer({ id: 'e2', name: 'Contoso Systems', memberId: null, joinedOn: '2018-06-01', leftOn: '2023-08-31', status: 'TRANSFERRED', statusDate: '2023-10-11', balance: 0, employeeBalance: 0, employerBalance: 0, transferredOutAmount: 312400, transferredToEmployerName: 'Northwind Labs' });

export const settled = (overrides: Partial<EpfEmployer> = {}) =>
  employer({ id: 'e3', name: 'Globex Retail', memberId: null, joinedOn: '2016-04-01', leftOn: '2018-05-31', status: 'SETTLED', statusDate: '2018-09-12', balance: 0, employeeBalance: 0, employerBalance: 0, pensionWithdrawn: true, ...overrides });

export const globexOpen = () => settled({ status: 'LEFT', statusDate: null, balance: 112600, employeeBalance: 61800, employerBalance: 50800, pensionWithdrawn: false });

/** The Sep 2026 contribution from the passbook: ₹7,200 + ₹5,950, pension ₹1,250. */
export function entry(overrides: Partial<EpfEntry> = {}): EpfEntry {
  return {
    id: 'n1',
    type: 'CONTRIBUTION',
    employerId: 'e1',
    employerName: 'Northwind Labs',
    wageMonth: '2026-09-01',
    creditedOn: '2026-10-15',
    employeeAmount: 7200,
    employerAmount: 5950,
    pensionAmount: 1250,
    runningBalance: 843210,
    source: 'PASSBOOK',
    importedAt: '2026-10-16T10:00:00Z',
    suggestion: undefined as never,
    ...overrides,
  };
}

/** What the summary sends as the newest contribution: the Sep 2026 one. */
export const latestContribution = () => ({
  employerId: 'e1',
  wageMonth: '2026-09-01',
  creditedOn: '2026-10-15',
  employeeAmount: 7200,
  employerAmount: 5950,
  pensionAmount: 1250,
});

export const manualContribution = () =>
  entry({ id: 'n2', source: 'MANUAL', importedAt: null, wageMonth: '2026-08-01', creditedOn: '2026-09-14', runningBalance: 830060 });

export const interest = () =>
  entry({ id: 'n3', type: 'INTEREST', wageMonth: null, interestFy: 2025, creditedOn: '2026-08-18', interestRate: 8.25, employeeAmount: 32410, employerAmount: 23770, pensionAmount: 0, runningBalance: 816910 });

export const opening = () =>
  entry({ id: 'n4', type: 'OPENING_BALANCE', wageMonth: null, creditedOn: '2026-04-01', employeeAmount: 410920, employerAmount: 297210, pensionAmount: 0, runningBalance: 708130 });

export const transferIn = () =>
  entry({
    id: 'n5',
    type: 'TRANSFER_IN',
    source: 'MANUAL',
    importedAt: null,
    wageMonth: null,
    creditedOn: '2023-10-11',
    employeeAmount: 171300,
    employerAmount: 141100,
    pensionAmount: 0,
    counterpartEmployerId: 'e2',
    counterpartEmployerName: 'Contoso Systems',
  });

export const transferOut = () =>
  entry({
    id: 'n6',
    type: 'TRANSFER_OUT',
    source: 'MANUAL',
    importedAt: null,
    wageMonth: null,
    creditedOn: '2023-10-11',
    employerId: 'e2',
    employerName: 'Contoso Systems',
    employeeAmount: 171300,
    employerAmount: 141100,
    pensionAmount: 0,
    counterpartEmployerId: 'e1',
    counterpartEmployerName: 'Northwind Labs',
  });

/** Medical advance, Form 31: ₹25,000 + ₹15,000 shares, added by hand. */
export const withdrawal = (overrides: Partial<EpfEntry> = {}) =>
  entry({
    id: 'n7',
    type: 'WITHDRAWAL',
    withdrawalKind: 'PARTIAL',
    source: 'MANUAL',
    importedAt: null,
    wageMonth: null,
    creditedOn: '2025-02-22',
    employeeAmount: 25000,
    employerAmount: 15000,
    pensionAmount: 0,
    note: 'Medical advance',
    ...overrides,
  });

export const pensionWithdrawal = () =>
  withdrawal({ id: 'n8', withdrawalKind: 'PENSION', employeeAmount: 0, employerAmount: 0, pensionAmount: 28400, note: null, creditedOn: '2018-09-12' });

export const bankCredit = (overrides: Record<string, unknown> = {}) => ({
  id: 't1',
  amount: 40000,
  date: '2025-02-24',
  description: 'NEFT CR EPFO MUMBAI',
  accountName: 'HDFC Bank ••4521',
  ...overrides,
});

export function summary(overrides: Partial<EpfSummary> = {}): EpfSummary {
  return {
    hasData: true,
    balance: 843210,
    fyEmployee: 43200,
    fyEmployer: 35700,
    interestEstimate: { fy: 2026, amount: 32880, rate: 8.25, rateFy: 2025 },
    lastInterest: { fy: 2025, amount: 56180, rate: 8.25, creditedOn: '2026-08-18' },
    pension: { monthlyContribution: 1250, serviceMonths: 100, estimatedMonthlyPension: 1714, eligible: false },
    staleThrough: null,
    throughMonth: '2026-09-01',
    latestContribution: { employerId: 'e1', wageMonth: '2026-09-01', creditedOn: '2026-10-15', employeeAmount: 7200, employerAmount: 5950, pensionAmount: 1250 },
    uanLast4: '4321',
    ...overrides,
  };
}
