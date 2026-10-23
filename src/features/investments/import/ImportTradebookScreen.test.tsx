import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import type { ImportCommitResult, JobResponse } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { broker, casPreview, reconcilePreview } from './import.fixtures';
import { ImportTradebookScreen } from './ImportTradebookScreen';

vi.mock('@/features/shell/ShellPage', () => ({
  ShellPage: ({ children, title, backHref }: { children: React.ReactNode; title: string; backHref?: string }) => (
    <div>
      <h1>{title}</h1>
      <a href={backHref}>Back to tradebook</a>
      {children}
    </div>
  ),
}));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

const started = vi.fn();
vi.mock('@/features/jobs/jobsBus', () => ({ emitJobStarted: (...a: unknown[]) => started(...a), subscribeJobStarted: () => () => {} }));

const polling = vi.hoisted(() => ({ jobId: null as string | null, settle: undefined as undefined | ((job: JobResponse<ImportCommitResult>) => void) }));
vi.mock('@/features/jobs/useJobStatusPolling', () => ({
  useJobStatusPolling: (jobId: string | null, cb: (job: JobResponse<ImportCommitResult>) => void) => {
    polling.jobId = jobId;
    polling.settle = cb;
  },
}));

const mutations = vi.hoisted(() => ({
  previewImport: vi.fn(),
  previewReconcile: vi.fn(),
  commitImport: vi.fn(),
  commitReconcile: vi.fn(),
}));
vi.mock('./useImportWizardMutations', () => ({
  useImportWizardMutations: () => ({
    previewImportMutation: { mutateAsync: mutations.previewImport },
    previewReconcileMutation: { mutateAsync: mutations.previewReconcile },
    commitImportMutation: { mutateAsync: mutations.commitImport },
    commitReconcileMutation: { mutateAsync: mutations.commitReconcile },
  }),
}));

// A stand-in for the instrument search: pressing its trigger picks an instrument.
vi.mock('../InstrumentSelect', () => ({
  InstrumentSelect: ({ trigger, onValueChange, type }: { trigger: React.ReactNode; onValueChange: (i: { id: string; name: string }) => void; type?: string }) => (
    <div data-type={type} onClick={() => onValueChange({ id: 'i-picked', name: 'ideaForge Technology Ltd' })}>
      {trigger}
    </div>
  ),
}));

const user = userEvent.setup({ pointerEventsCheck: 0 });
const brokers = [broker()];
const taxFile = new File(['x'], 'taxpnl_FY26-27.xlsx');
const tradebookFile = new File(['y'], 'tradebook_FY26-27.csv');
const casFile = new File(['z'], 'cas_CAMS_Oct2026.pdf');

const fileInput = (zone: string) => screen.getByTestId(zone).querySelector('input[type="file"]') as HTMLInputElement;

async function pickOption(label: RegExp | string, option: RegExp | string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function chooseAccount() {
  await pickOption(/Target broker account/, 'Zerodha main (Zerodha)');
}

async function uploadZerodha() {
  await chooseAccount();
  await user.upload(fileInput('taxpnl-zone'), taxFile);
  await user.upload(fileInput('tradebook-zone'), tradebookFile);
}

const preview = () => user.click(screen.getByRole('button', { name: 'Preview reconciliation' }));
const checked = () => screen.getAllByRole('checkbox', { name: 'Select row' }).map((c) => (c as HTMLInputElement).getAttribute('aria-checked') ?? (c as HTMLInputElement).checked);
const job = (over: Partial<JobResponse<ImportCommitResult>>) =>
  ({ id: 'job-1', type: 'INVESTMENT_IMPORT', status: 'SUCCEEDED', ...over }) as JobResponse<ImportCommitResult>;

beforeEach(() => {
  vi.clearAllMocks();
  polling.jobId = null;
  mutations.previewReconcile.mockResolvedValue(reconcilePreview());
  mutations.previewImport.mockResolvedValue(casPreview());
  mutations.commitReconcile.mockResolvedValue({ jobId: 'job-1' });
  mutations.commitImport.mockResolvedValue({ jobId: 'job-1' });
});

describe('ImportTradebookScreen: step 1', () => {
  it('is a page with a back link, the Stepper and the Zerodha form', () => {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    expect(screen.getByRole('heading', { name: 'Import tradebook' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to tradebook' })).toHaveAttribute('href', '/ds/investments/tradebook');
    expect(screen.getByText('Investment bulk import')).toBeInTheDocument();
    expect(screen.getAllByText('Upload files').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Review').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Result').length).toBeGreaterThan(0);
    expect(screen.getByRole('combobox', { name: /Broker \/ import type/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Asset scope/ })).toBeInTheDocument();
    expect(screen.getByText('1. Zerodha Tax P&L (XLSX)')).toBeInTheDocument();
    expect(screen.getByText('2. Zerodha Tradebook')).toBeInTheDocument();
    expect(screen.getByText('3. Holdings snapshot anchor (optional)')).toBeInTheDocument();
    expect(screen.getByText('Authoritative intraday & clean FIFO:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/ds/investments/tradebook');
  });

  it('asks for a target account, then a tradebook, then a tax P&L, and stays on step 1', async () => {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await preview();
    expect(showToast).toHaveBeenLastCalledWith('Please select a target broker account.', { tone: 'danger' });
    await chooseAccount();
    await preview();
    expect(showToast).toHaveBeenLastCalledWith('Please upload at least one Tradebook / Order History file.', { tone: 'danger' });
    await user.upload(fileInput('tradebook-zone'), tradebookFile);
    await preview();
    expect(showToast).toHaveBeenLastCalledWith('Please upload at least one Tax P&L / Capital Gains file.', { tone: 'danger' });
    expect(mutations.previewReconcile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Preview reconciliation' })).toBeInTheDocument();
  });

  it('shows the files queued with a remove button', async () => {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await user.upload(fileInput('taxpnl-zone'), [taxFile, new File(['q'], 'taxpnl_FY25-26.xlsx')]);
    expect(screen.getByText('taxpnl_FY26-27.xlsx')).toBeInTheDocument();
    expect(screen.getByText('taxpnl_FY25-26.xlsx')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove taxpnl_FY26-27.xlsx' }));
    expect(screen.queryByText('taxpnl_FY26-27.xlsx')).not.toBeInTheDocument();
    expect(screen.getByText('taxpnl_FY25-26.xlsx')).toBeInTheDocument();
  });

  it('F&O only: the Tax P&L alone, no tradebook or holdings box, and the F&O note', async () => {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await pickOption(/Asset scope/, 'F&O only');
    expect(screen.queryByTestId('tradebook-zone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('holdings-zone')).not.toBeInTheDocument();
    expect(screen.getByText('F&O realized P&L:')).toBeInTheDocument();
    await chooseAccount();
    await user.upload(fileInput('taxpnl-zone'), taxFile);
    await preview();
    await waitFor(() => expect(mutations.previewReconcile).toHaveBeenCalled());
    expect(mutations.previewReconcile.mock.calls[0][0]).toMatchObject({ broker: 'zerodha', brokerAccountId: 'b1', assetScope: 'fno', tradebookFiles: [], taxpnlFiles: [taxFile], holdingsFile: null });
  });

  it('Groww: no asset scope, its own section names, and the Groww broker in the request', async () => {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await pickOption(/Broker \/ import type/, /Groww reconciliation/);
    expect(screen.queryByRole('combobox', { name: /Asset scope/ })).not.toBeInTheDocument();
    expect(screen.getByText('1. Groww Capital Gains (XLSX)')).toBeInTheDocument();
    expect(screen.getByText('2. Groww Order History')).toBeInTheDocument();
    await chooseAccount();
    await user.upload(fileInput('taxpnl-zone'), taxFile);
    await user.upload(fileInput('tradebook-zone'), tradebookFile);
    await user.upload(fileInput('holdings-zone'), new File(['h'], 'holdings.csv'));
    await preview();
    await waitFor(() => expect(mutations.previewReconcile).toHaveBeenCalled());
    const req = mutations.previewReconcile.mock.calls[0][0];
    expect(req).toMatchObject({ broker: 'groww', assetScope: undefined });
    expect(req.holdingsFile.name).toBe('holdings.csv');
  });

  it('CAS: a password field and one file; asks for the file first', async () => {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await pickOption(/Broker \/ import type/, /Mutual funds CAS/);
    expect(screen.queryByRole('combobox', { name: /Asset scope/ })).not.toBeInTheDocument();
    await chooseAccount();
    await preview();
    expect(showToast).toHaveBeenLastCalledWith('Please select a CAS PDF/CSV file.', { tone: 'danger' });
    await user.type(screen.getByLabelText('CAS PDF password'), 'ABCDE1234F');
    await user.upload(fileInput('cas-zone'), casFile);
    await preview();
    await waitFor(() => expect(mutations.previewImport).toHaveBeenCalledWith({ file: casFile, brokerAccountId: 'b1', password: 'ABCDE1234F' }));
  });

  it('keeps step 1 and says why when the server rejects the files', async () => {
    mutations.previewReconcile.mockRejectedValueOnce(new ApiError(400, { message: 'Tax P&L file is not a Zerodha report for FY 2026-27' } as never));
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await uploadZerodha();
    await preview();
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Failed to preview import: Tax P&L file is not a Zerodha report for FY 2026-27', { tone: 'danger' }),
    );
    expect(screen.getByRole('button', { name: 'Preview reconciliation' })).toBeEnabled();
    expect(screen.getByText('taxpnl_FY26-27.xlsx')).toBeInTheDocument();
  });

  it('locks the form and changes the button while it reads the files', async () => {
    let resolve: (v: unknown) => void = () => {};
    mutations.previewReconcile.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await uploadZerodha();
    await preview();
    expect(await screen.findByRole('button', { name: /Reconciling & parsing files/ })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /Broker \/ import type/ })).toBeDisabled();
    await act(async () => resolve(reconcilePreview()));
  });
});

describe('ImportTradebookScreen: step 2, Zerodha review', () => {
  async function toReview() {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await uploadZerodha();
    await preview();
    await screen.findByText('Stocks & delivery executions');
  }

  it('shows the counters, the unmapped banner, the alerts and both tables', async () => {
    await toReview();
    expect(screen.getByText('38')).toBeInTheDocument();
    expect(screen.getByText('31 / 7')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('2 executions have no instrument mapped and will NOT be imported. Map each below, or exclude them.')).toBeInTheDocument();
    expect(screen.getByText('Unmapped scrips: IDEAFORGE, TATATECH')).toBeInTheDocument();
    expect(screen.getByText('Reconciliation alerts & flags (2)')).toBeInTheDocument();
    expect(screen.getByText('[UNRESOLVED_INSTRUMENT]:')).toBeInTheDocument();
    expect(screen.getByText('F&O closed trades')).toBeInTheDocument();
    expect(screen.getByText('2 contracts')).toBeInTheDocument();
    expect(screen.getByText(/Net realized P&L:/)).toHaveTextContent('Net realized P&L: +₹18,232.40');
    expect(screen.getByText('NIFTY2682824500CE')).toBeInTheDocument();
    expect(screen.getAllByText('Reliance Industries Ltd').length).toBeGreaterThan(0);
  });

  it('hides and shows the alerts', async () => {
    await toReview();
    await user.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText('[UNRESOLVED_INSTRUMENT]:')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByText('[UNRESOLVED_INSTRUMENT]:')).toBeInTheDocument();
  });

  it('starts with every row included except duplicates, and counts what will import', async () => {
    await toReview();
    // Executions: RELIANCE (duplicate) first, then IDEAFORGE, TATATECH, ZOMATO; F&O: the call, then the duplicate put.
    expect(checked().map(String)).toEqual(['false', 'true', 'true', 'true', 'true', 'false']);
    expect(screen.getByRole('button', { name: 'Import trades (2)' })).toBeDisabled();
  });

  it('blocks Import until every included row has an instrument; Skip unmapped rows unblocks it', async () => {
    await toReview();
    await user.click(screen.getByRole('button', { name: 'Skip unmapped rows' }));
    expect(screen.queryByText(/have no instrument mapped/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import trades (2)' })).toBeEnabled();
    expect(checked().map(String)).toEqual(['false', 'false', 'false', 'true', 'true', 'false']);
  });

  it('maps an unmatched row to an instrument and lets you change it', async () => {
    await toReview();
    await user.click(screen.getAllByRole('button', { name: 'Map instrument' })[0]);
    expect(screen.getAllByText('Mapped').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ideaForge Technology Ltd').length).toBeGreaterThan(0);
    expect(screen.getByText('1 execution has no instrument mapped and will NOT be imported. Map each below, or exclude them.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import trades (3)' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'change' }).length).toBeGreaterThan(0);
  });

  it('creates a new instrument from a row and undoes it', async () => {
    await toReview();
    await user.click(screen.getAllByRole('button', { name: 'Create new' })[0]);
    expect(screen.getAllByText('New').length).toBeGreaterThan(0);
    expect(screen.getAllByText('no live price').length).toBeGreaterThan(0);
    expect(screen.getByText('1 execution has no instrument mapped and will NOT be imported. Map each below, or exclude them.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'undo' })[0]);
    expect(screen.getByText('2 executions have no instrument mapped and will NOT be imported. Map each below, or exclude them.')).toBeInTheDocument();
  });

  it('includes and excludes a row with its box, and the F&O net follows', async () => {
    await toReview();
    const boxes = screen.getAllByRole('checkbox', { name: 'Select row' });
    await user.click(boxes[5]); // the duplicate put
    expect(screen.getByText(/Net realized P&L:/)).toHaveTextContent('Net realized P&L: +₹15,412.40');
    await user.click(boxes[4]); // the call
    expect(screen.getByText(/Net realized P&L:/)).toHaveTextContent('Net realized P&L: −₹2,820.00');
    expect(screen.getByRole('button', { name: 'Import trades (2)' })).toBeDisabled();
    await user.click(boxes[3]); // ZOMATO
    expect(screen.getByRole('button', { name: 'Import trades (1)' })).toBeDisabled();
  });

  it('goes back to step 1 with the files still there', async () => {
    await toReview();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('taxpnl_FY26-27.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview reconciliation' })).toBeInTheDocument();
  });
});

describe('ImportTradebookScreen: import job and result', () => {
  async function toImport() {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await uploadZerodha();
    await preview();
    await screen.findByText('Stocks & delivery executions');
    await user.click(screen.getByRole('button', { name: 'Skip unmapped rows' }));
    await user.click(screen.getByRole('button', { name: 'Import trades (2)' }));
    await waitFor(() => expect(polling.jobId).toBe('job-1'));
  }

  it('sends what is included, starts the job, and locks the buttons while it runs', async () => {
    await toImport();
    const req = mutations.commitReconcile.mock.calls[0][0];
    expect(req).toMatchObject({ broker: 'zerodha', brokerAccountId: 'b1' });
    expect(req.executions.map((e: { rowIndex: number; skip: boolean }) => [e.rowIndex, e.skip])).toEqual([[1, false], [2, true], [3, true], [4, true]]);
    expect(req.fnoTrades.map((t: { skip: boolean }) => t.skip)).toEqual([false, true]);
    expect(started).toHaveBeenCalledWith('job-1');
    expect(showToast).toHaveBeenCalledWith('Reconciliation commit job started in background.');
    expect(screen.getByRole('button', { name: 'Importing reconciled executions…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('shows the result with the failed and skipped lists, and Done & view portfolio', async () => {
    await toImport();
    act(() =>
      polling.settle?.(
        job({
          result: {
            committed: 33,
            skipped: 1,
            failed: [{ rowIndex: 22, scrip: 'TATATECH', reason: 'sell quantity 25 exceeds holding 0' }, { rowIndex: 31, reason: 'trade date is before the account was opened' }],
            skippedItems: [{ rowIndex: 9, scrip: 'RELIANCE', reason: 'already imported (same exchange reference)' }],
          },
        }),
      ),
    );
    expect(await screen.findByText('Broker import reconciliation complete')).toBeInTheDocument();
    expect(screen.getByText('Zerodha main (Zerodha)')).toBeInTheDocument();
    expect(screen.getByText('33')).toBeInTheDocument();
    expect(screen.getByText('Failed executions (2)')).toBeInTheDocument();
    expect(screen.getByText('#22 TATATECH — sell quantity 25 exceeds holding 0')).toBeInTheDocument();
    expect(screen.getByText('#31 trade date is before the account was opened')).toBeInTheDocument();
    expect(screen.getByText('Skipped executions (1)')).toBeInTheDocument();
    expect(screen.getByText('#9 RELIANCE — already imported (same exchange reference)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Done & view portfolio' })).toHaveAttribute('href', '/ds/investments');
  });

  it('shows no lists when nothing failed or was skipped', async () => {
    await toImport();
    act(() => polling.settle?.(job({ result: { committed: 36, skipped: 0, failed: [], skippedItems: [] } })));
    expect(await screen.findByText('Broker import reconciliation complete')).toBeInTheDocument();
    expect(screen.queryByText(/Failed executions/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Skipped executions/)).not.toBeInTheDocument();
  });

  it('stays on the review with the server message when the job fails', async () => {
    await toImport();
    act(() => polling.settle?.(job({ status: 'FAILED', errorMessage: 'Ledger is locked' })));
    expect(showToast).toHaveBeenLastCalledWith('Ledger is locked', { tone: 'danger' });
    expect(screen.getByRole('button', { name: 'Import trades (2)' })).toBeEnabled();
    expect(screen.queryByText('Broker import reconciliation complete')).not.toBeInTheDocument();
  });

  it('says so when the job is cancelled', async () => {
    await toImport();
    act(() => polling.settle?.(job({ status: 'CANCELLED' })));
    expect(showToast).toHaveBeenLastCalledWith('Import commit job was cancelled.');
    expect(screen.getByRole('button', { name: 'Import trades (2)' })).toBeEnabled();
  });

  it('says what failed when the commit request is rejected', async () => {
    mutations.commitReconcile.mockRejectedValueOnce(new Error('Network down'));
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await uploadZerodha();
    await preview();
    await screen.findByText('Stocks & delivery executions');
    await user.click(screen.getByRole('button', { name: 'Skip unmapped rows' }));
    await user.click(screen.getByRole('button', { name: 'Import trades (2)' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Failed to commit import: Network down', { tone: 'danger' }));
    expect(screen.getByRole('button', { name: 'Import trades (2)' })).toBeEnabled();
  });
});

describe('ImportTradebookScreen: switching the import type', () => {
  it('shows the new preview, not the old one, after Back, a change of type and a new preview', async () => {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await uploadZerodha();
    await preview();
    await screen.findByText('Stocks & delivery executions');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await pickOption(/Broker \/ import type/, /Mutual funds CAS/);
    await user.upload(fileInput('cas-zone'), casFile);
    await preview();
    await screen.findByText('Statement transactions');
    expect(screen.queryByText('Stocks & delivery executions')).not.toBeInTheDocument();
    expect(screen.queryByText('F&O closed trades')).not.toBeInTheDocument();
  });

  it('shows the Zerodha review when the type is switched back before Back is pressed', async () => {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await pickOption(/Broker \/ import type/, /Mutual funds CAS/);
    await chooseAccount();
    await user.upload(fileInput('cas-zone'), casFile);
    await preview();
    await screen.findByText('Statement transactions');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await pickOption(/Broker \/ import type/, /Zerodha reconciliation/);
    await user.upload(fileInput('taxpnl-zone'), taxFile);
    await user.upload(fileInput('tradebook-zone'), tradebookFile);
    await preview();
    await screen.findByText('Stocks & delivery executions');
    expect(screen.queryByText('Statement transactions')).not.toBeInTheDocument();
  });
});

describe('ImportTradebookScreen: statement (CAS) review', () => {
  async function toCasReview() {
    renderWithQuery(<ImportTradebookScreen brokers={brokers} />);
    await pickOption(/Broker \/ import type/, /Mutual funds CAS/);
    await chooseAccount();
    await user.upload(fileInput('cas-zone'), casFile);
    await preview();
    await screen.findByText('Statement transactions');
  }

  it('lists the statement transactions with include boxes, counters and the file note', async () => {
    await toCasReview();
    expect(screen.getByText('Folio 12345678/0')).toBeInTheDocument();
    expect(screen.getByText('1 row could not be read and will NOT be imported.')).toBeInTheDocument();
    expect(screen.getAllByText('E2E Bluechip Growth Fund').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unknown Midcap Fund').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Could not read the units').length).toBeGreaterThan(0);
    expect(screen.getAllByText('40.5 × ₹123.46').length).toBeGreaterThan(0);
    // Order: unreadable (4)... sorted by need: unmatched 2, duplicate 3, unreadable 4, then 1.
    expect(checked().map(String)).toEqual(['true', 'false', 'false', 'true']);
  });

  it('blocks Import while an included row has no fund, maps it, and commits the rows with their choices', async () => {
    await toCasReview();
    expect(screen.getByText('1 row has no instrument mapped and will NOT be imported. Map each below, or exclude them.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import trades (1)' })).toBeDisabled();
    await user.click(screen.getAllByRole('button', { name: 'Map instrument' })[0]);
    expect(screen.getByRole('button', { name: 'Import trades (2)' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Import trades (2)' }));
    await waitFor(() => expect(mutations.commitImport).toHaveBeenCalled());
    const req = mutations.commitImport.mock.calls[0][0];
    expect(req).toMatchObject({ source: 'mf_cas', brokerAccountId: 'b1' });
    expect(req.rows.map((r: { rowIndex: number; skip: boolean; instrumentId?: string }) => [r.rowIndex, r.skip, r.instrumentId])).toEqual([
      [1, false, 'f1'],
      [2, false, 'i-picked'],
      [3, true, 'f1'],
      [4, true, 'f1'],
    ]);
    expect(showToast).toHaveBeenCalledWith('Import commit job started in background.');
  });

  it('Skip unmapped rows excludes the unmatched fund', async () => {
    await toCasReview();
    await user.click(screen.getByRole('button', { name: 'Skip unmapped rows' }));
    expect(screen.getByRole('button', { name: 'Import trades (1)' })).toBeEnabled();
  });

  it('keeps an unreadable row excluded even when every row is selected', async () => {
    await toCasReview();
    const boxes = screen.getAllByRole('checkbox');
    await user.click(boxes[0]); // the header: select every row
    await waitFor(() => expect(screen.getByRole('button', { name: /Import trades/ })).toBeInTheDocument());
    const rows = screen.getAllByRole('checkbox', { name: 'Select row' });
    expect(rows).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: 'Skip unmapped rows' }));
    await user.click(screen.getByRole('button', { name: /Import trades/ }));
    await waitFor(() => expect(mutations.commitImport).toHaveBeenCalled());
    const sent = mutations.commitImport.mock.calls[0][0].rows.find((r: { rowIndex: number }) => r.rowIndex === 4);
    expect(sent.skip).toBe(true);
  });
});

