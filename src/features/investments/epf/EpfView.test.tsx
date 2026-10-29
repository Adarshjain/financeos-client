import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConcealProvider } from '@/components/ds';
import { renderWithQuery } from '@/test/renderWithQuery';

import { bankCredit, employer, entry, interest, latestContribution, manualContribution, opening, settled, summary, transferIn, transferred, withdrawal } from './epf.fixtures';
import { employerRow, epfFigures, epfRow, fyOptions, missingMonths, parseEpfUrl, passbookSubtitle } from './epfModel';
import { EpfView, type EpfViewProps } from './EpfView';

const router = { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/date-range', () => ({ todayInAppZone: () => '2026-10-27' }));
vi.mock('@/features/transactions/TransactionPickerField', () => ({ TransactionPickerField: () => <div /> }));
vi.mock('@/lib/query/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [] }) }));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const actions = vi.hoisted(() => ({ loadEpfFormOptions: vi.fn() }));
vi.mock('./epfActions', () => actions);

const http = vi.hoisted(() => ({ POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/client', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/client')>()), api: http }));

const today = '2026-10-27';
const base = [entry(), manualContribution(), interest(), opening()];

function props(over: Partial<EpfViewProps> = {}, entries = base, employers = [employer()], state = parseEpfUrl({})): EpfViewProps {
  const sum = over.summary ?? summary();
  return {
    state,
    summary: sum,
    figures: epfFigures(sum),
    entries,
    rows: entries.map((e) => epfRow(e)),
    totalElements: entries.length,
    totalPages: 1,
    subtitle: passbookSubtitle(employers[0], '4321', employers.length),
    fyOptions: fyOptions([2026, 2025], 2026),
    fyValue: '2026',
    employers,
    employerRows: employers.map(employerRow),
    employerOptions: [],
    employerValue: employers[0]?.id ?? 'all',
    stale: null,
    latestContribution: latestContribution(),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  http.POST.mockResolvedValue({ data: {} });
  http.PUT.mockResolvedValue({ data: {} });
  http.DELETE.mockResolvedValue({});
  actions.loadEpfFormOptions.mockResolvedValue({ success: true, data: { employers: [employer()], latestContribution: entry() } });
});

describe('EpfView: the figures', () => {
  it('shows the four tiles with their captions', () => {
    renderWithQuery(<EpfView {...props()} />);
    for (const text of ['EPF balance', 'Contributed this FY', 'Interest so far this FY', 'Last interest credited']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('₹8,43,210').length).toBeGreaterThan(0);
    expect(screen.getByText('Passbook up to September 2026')).toBeInTheDocument();
    expect(screen.getAllByText('₹78,900').length).toBeGreaterThan(0);
    expect(screen.getByText('You ₹43,200 · employer ₹35,700')).toBeInTheDocument();
    expect(screen.getAllByText('≈ ₹32,880').length).toBeGreaterThan(0);
    expect(screen.getByText('Estimate at 8.25% · credited after 31 Mar')).toBeInTheDocument();
    expect(screen.getAllByText('₹56,180').length).toBeGreaterThan(0);
    expect(screen.getByText('FY 2025-26 at 8.25% · 18 Aug')).toBeInTheDocument();
  });

  it('shows the phone hero: the balance, then contributed, interest so far and last interest', () => {
    renderWithQuery(<EpfView {...props()} />);
    expect(screen.getByText('Up to September 2026')).toBeInTheDocument();
    expect(screen.getByText('You ₹43,200')).toBeInTheDocument();
    expect(screen.getByText('Interest so far')).toBeInTheDocument();
    expect(screen.getByText('Estimate at 8.25%')).toBeInTheDocument();
    expect(screen.getByText('Last interest ₹56,180 · FY 2025-26')).toBeInTheDocument();
  });

  it('leaves the last interest line out of the phone hero when nothing was credited yet', () => {
    const sum = summary({ lastInterest: undefined });
    renderWithQuery(<EpfView {...props({ summary: sum, figures: epfFigures(sum) })} />);
    expect(screen.queryByText(/^Last interest ₹/)).toBeNull();
  });

  it('shows ₹0 and "No balance yet" with no balance', () => {
    const sum = summary({ balance: 0, interestEstimate: undefined, lastInterest: undefined, throughMonth: null });
    renderWithQuery(<EpfView {...props({ summary: sum, figures: epfFigures(sum) })} />);
    expect(screen.getAllByText('No balance yet').length).toBeGreaterThan(0);
  });

  it('hides every figure when amounts are hidden', () => {
    renderWithQuery(
      <ConcealProvider concealed>
        <EpfView {...props()} />
      </ConcealProvider>,
    );
    expect(screen.queryByText('₹78,900')).toBeNull();
    expect(screen.queryByText('₹56,180')).toBeNull();
    expect(screen.getAllByText('₹ —').length).toBeGreaterThanOrEqual(4);
  });
});

describe('EpfView: no EPF yet', () => {
  const empty = () => props({ summary: summary({ hasData: false }) }, [], []);

  it('shows the empty state with both first steps and no figures', () => {
    renderWithQuery(<EpfView {...empty()} />);
    expect(screen.getByText('No EPF yet')).toBeInTheDocument();
    expect(screen.getByText(/Upload your EPFO passbook to bring in every contribution/)).toBeInTheDocument();
    expect(screen.queryByText('EPF balance')).toBeNull();
    expect(screen.queryByText('Passbook')).toBeNull();
  });

  it('leads with Upload passbook, then Add opening balance', () => {
    renderWithQuery(<EpfView {...empty()} />);
    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    expect(labels.indexOf('Upload passbook')).toBeLessThan(labels.indexOf('Add opening balance'));
  });

  it('Upload passbook goes to Import with the EPF type', () => {
    renderWithQuery(<EpfView {...empty()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Upload passbook' }));
    expect(router.push).toHaveBeenCalledWith('/investments/import?type=epf');
  });

  it('Add opening balance opens Record entry on Opening balance', async () => {
    renderWithQuery(<EpfView {...empty()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add opening balance' }));
    expect(await screen.findByText('Record EPF entry')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox', { name: /^Type/ })).toHaveTextContent('Opening balance'));
  });

  it('keeps Add entry open on Opening balance when the first employer ends the empty state', async () => {
    const { rerender } = renderWithQuery(<EpfView {...empty()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add opening balance' }));
    expect(await screen.findByText('Record EPF entry')).toBeInTheDocument();
    rerender(<EpfView {...props()} />);
    expect(screen.getByText('Record EPF entry')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Type/ })).toHaveTextContent('Opening balance');
  });
});

describe('EpfView: the passbook', () => {
  it('draws one row per entry with the shares, the muted pension and the balance', () => {
    renderWithQuery(<EpfView {...props()} />);
    expect(screen.getAllByText('Passbook').length).toBeGreaterThan(0);
    expect(screen.getByText('Northwind Labs · member ID …67890 · UAN …4321')).toBeInTheDocument();
    expect(screen.getAllByText('+₹7,200').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+₹5,950').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹1,250').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Interest · FY 2025-26').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Opening balance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Added by you').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹4,10,920').length).toBeGreaterThan(0);
  });

  it("splits a contribution on the phone line between you and the employer, by name", () => {
    renderWithQuery(<EpfView {...props()} />);
    expect(screen.getAllByText('You ₹7,200 ·')[0].parentElement).toHaveTextContent(/^You ₹7,200 ·\s*Northwind Labs\s*₹5,950$/);
  });

  it('hides the amounts on the phone lines when amounts are hidden', () => {
    renderWithQuery(
      <ConcealProvider concealed>
        <EpfView {...props({}, [entry(), withdrawal()])} />
      </ConcealProvider>,
    );
    expect(screen.queryByText('You ₹7,200 ·')).toBeNull();
    expect(screen.getAllByText('You ₹ — ·').length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Withdrawal · You ₹25,000/)).toBeNull();
  });

  it('draws transfers and withdrawals in the passbook', () => {
    const list = [withdrawal(), transferIn()];
    renderWithQuery(<EpfView {...props({}, list)} />);
    expect(screen.getAllByText('Contoso Systems → Northwind Labs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Medical advance (Form 31)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('−₹40,000').length).toBeGreaterThan(0);
  });

  it('opens an entry when its row is pressed', async () => {
    renderWithQuery(<EpfView {...props()} />);
    fireEvent.click(screen.getAllByText('September 2026')[0]);
    expect(await screen.findByText('September 2026 contribution')).toBeInTheDocument();
    expect(screen.getByText(/From the passbook imported on 16 Oct/)).toBeInTheDocument();
  });

  it('follows the fresh row of the open entry, and keeps it when the page no longer lists it', async () => {
    const view = renderWithQuery(<EpfView {...props({}, [manualContribution()])} />);
    fireEvent.click(screen.getAllByText('August 2026')[0]);
    await screen.findByText('August 2026 contribution');
    expect((screen.getByLabelText(/^Your share/) as HTMLInputElement).value).toBe('7200');
    view.rerender(<EpfView {...props({}, [{ ...manualContribution(), employeeAmount: 7500 }])} />);
    expect((screen.getByLabelText(/^Your share/) as HTMLInputElement).value).toBe('7200');
    view.rerender(<EpfView {...props({}, [])} />);
    expect(screen.getByText('August 2026 contribution')).toBeInTheDocument();
  });

  it('shows an empty line when the period has no entries', () => {
    renderWithQuery(<EpfView {...props({ totalElements: 0 }, [])} />);
    expect(screen.getByText('No entries in this period.')).toBeInTheDocument();
  });

  it('Upload passbook in the header goes to Import with the EPF type', () => {
    renderWithQuery(<EpfView {...props()} />);
    expect(screen.getByRole('link', { name: 'Upload passbook' })).toHaveAttribute('href', '/investments/import?type=epf');
  });
});

describe('EpfView: the stale banner', () => {
  it('names the months to bring in and links to Upload passbook', () => {
    renderWithQuery(<EpfView {...props({ stale: { through: '2026-07-01', missing: missingMonths('2026-07-01', today) } })} />);
    expect(screen.getByText('Your passbook is up to July 2026. Upload a newer one to bring in Aug and Sep.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Upload passbook' })[0]);
    expect(router.push).toHaveBeenCalledWith('/investments/import?type=epf');
  });

  it('is not shown when the passbook is current', () => {
    renderWithQuery(<EpfView {...props()} />);
    expect(screen.queryByText(/Your passbook is up to/)).toBeNull();
  });
});

describe('EpfView: the FY and employer choices and the pager', () => {
  it('changes the FY in the address and goes back to the first page', async () => {
    renderWithQuery(<EpfView {...props({}, base, [employer()], parseEpfUrl({ page: '1' }))} />);
    fireEvent.click(screen.getByRole('button', { name: 'FY 2026-27' }));
    fireEvent.click(await screen.findByRole('option', { name: 'FY 2025-26' }));
    expect(router.push).toHaveBeenCalledWith('/investments/epf?fy=2025', { scroll: false });
  });

  it('offers every year', async () => {
    renderWithQuery(<EpfView {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'FY 2026-27' }));
    fireEvent.click(await screen.findByRole('option', { name: 'All years' }));
    expect(router.push).toHaveBeenCalledWith('/investments/epf?fy=all', { scroll: false });
  });

  it('has no employer select with a single employer', () => {
    renderWithQuery(<EpfView {...props()} />);
    expect(screen.getByRole('button', { name: 'FY 2026-27' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All employers' })).not.toBeInTheDocument();
  });

  it('has an employer select with more than one employer; a change keeps the year shown and starts at page 1', async () => {
    const employers = [employer(), transferred(), settled()];
    renderWithQuery(
      <EpfView
        {...props(
          {
            employerOptions: [{ value: 'all', label: 'All employers' }, ...employers.map((e) => ({ value: e.id, label: e.name }))],
            employerValue: 'e1',
          },
          base,
          employers,
          parseEpfUrl({ fy: '2025', page: '2' }),
        )}
      />,
    );
    expect(screen.getByRole('button', { name: 'FY 2026-27' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: employers[0].name }));
    fireEvent.click(await screen.findByRole('option', { name: 'Contoso Systems' }));
    expect(router.push).toHaveBeenCalledWith('/investments/epf?fy=2026&employer=e2', { scroll: false });
  });

  it('a new employer keeps All years', async () => {
    const employers = [employer(), transferred(), settled()];
    renderWithQuery(
      <EpfView
        {...props(
          {
            employerOptions: [{ value: 'all', label: 'All employers' }, ...employers.map((e) => ({ value: e.id, label: e.name }))],
            employerValue: 'e1',
            fyValue: 'all',
          },
          base,
          employers,
          parseEpfUrl({ fy: 'all' }),
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: employers[0].name }));
    fireEvent.click(await screen.findByRole('option', { name: 'All employers' }));
    expect(router.push).toHaveBeenCalledWith('/investments/epf?fy=all&employer=all', { scroll: false });
  });

  it('pages in the address', () => {
    renderWithQuery(<EpfView {...props({ totalElements: 60, totalPages: 3 }, base, [employer()], parseEpfUrl({ page: '1' }))} />);
    fireEvent.click(screen.getAllByRole('button', { name: /next/i })[0]);
    expect(router.push).toHaveBeenCalledWith('/investments/epf?page=2', { scroll: false });
  });
});

describe('EpfView: the employers card', () => {
  const three = [employer(), transferred(), settled()];

  it('lists every employer with its balance and status', () => {
    renderWithQuery(<EpfView {...props({}, base, three)} />);
    expect(screen.getByText('Employers')).toBeInTheDocument();
    expect(screen.getByText('Member ID …67890 · since September 2023')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Transferred')).toBeInTheDocument();
    expect(screen.getByText('Settled')).toBeInTheDocument();
    expect(screen.getByText('June 2018 – August 2023 · ₹3,12,400 moved to Northwind Labs on 11 Oct 2023')).toBeInTheDocument();
    expect(screen.getByText('April 2016 – May 2018 · final settlement and pension withdrawn 12 Sep 2018')).toBeInTheDocument();
  });

  it('Add employer opens the employer form and saves it', async () => {
    renderWithQuery(<EpfView {...props({}, base, three)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add employer' }));
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Fabrikam Ltd' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add employer' }).at(-1)!);
    await waitFor(() => expect(http.POST).toHaveBeenCalledWith('/api/v1/epf/employers', { body: { name: 'Fabrikam Ltd', memberId: null, joinedOn: null, leftOn: null } }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith('Employer added');
  });

  it('a row opens the employer to edit', async () => {
    renderWithQuery(<EpfView {...props({}, base, three)} />);
    fireEvent.click(screen.getByText('Globex Retail'));
    expect(await screen.findByText('Edit employer')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Globex Retail');
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Globex Retail Pvt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save employer' }));
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/epf/employers/{id}', {
        params: { path: { id: 'e3' } },
        body: { name: 'Globex Retail Pvt', memberId: null, joinedOn: '2016-04-01', leftOn: '2018-05-31' },
      }),
    );
  });

  it('asks for a name', async () => {
    renderWithQuery(<EpfView {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add employer' }));
    await screen.findByLabelText(/^Name/);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add employer' }).at(-1)!);
    expect(await screen.findByText('Enter the employer name.')).toBeInTheDocument();
    expect(http.POST).not.toHaveBeenCalled();
  });
});

describe('EpfView: the pension card', () => {
  it('shows the estimate at 58 and the service counted, with what is needed when not eligible', () => {
    renderWithQuery(<EpfView {...props()} />);
    expect(screen.getByText('Pension (EPS)')).toBeInTheDocument();
    expect(screen.getByText('₹1,714')).toBeInTheDocument();
    expect(screen.getByText('a month at 58')).toBeInTheDocument();
    expect(screen.getByText(/Your employer pays ₹1,250 a month into the pension fund; it is not in your EPF balance or your net worth\./)).toBeInTheDocument();
    expect(screen.getByText('Service counted: 8 years 4 months · pension needs 10 years')).toBeInTheDocument();
  });

  it('drops the needs-10-years note once eligible', () => {
    const sum = summary({ pension: { monthlyContribution: 1250, serviceMonths: 130, estimatedMonthlyPension: 2000, eligible: true } });
    renderWithQuery(<EpfView {...props({ summary: sum })} />);
    expect(screen.getByText('Service counted: 10 years 10 months')).toBeInTheDocument();
  });

  it('is hidden when the server has no pension', () => {
    renderWithQuery(<EpfView {...props({ summary: summary({ pension: undefined }) })} />);
    expect(screen.queryByText('Pension (EPS)')).toBeNull();
  });
});

describe('EpfView: a bank credit on an open withdrawal', () => {
  it('shows the suggestion and refreshes the page after Link', async () => {
    const w = withdrawal({ suggestion: bankCredit() });
    renderWithQuery(<EpfView {...props({}, [w])} />);
    fireEvent.click(screen.getAllByText('Medical advance (Form 31)')[0]);
    expect(await screen.findByText('Suggested match')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    await waitFor(() => expect(http.PUT).toHaveBeenCalledWith('/api/v1/epf/entries/{id}/transaction', expect.anything()));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });
});
