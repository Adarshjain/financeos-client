import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { mockRouter } from '@/test/next-mocks';
import { renderWithQuery } from '@/test/renderWithQuery';

import type { EpfImportResult, EpfPreview } from './epfImportModel';
import { broker } from './import.fixtures';
import { ImportTradebookScreen } from './ImportTradebookScreen';

vi.mock('@/features/shell/ShellPage', () => ({
  ShellPage: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

const showToast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));
vi.mock('@/features/jobs/jobsBus', () => ({ emitJobStarted: vi.fn(), subscribeJobStarted: () => () => {} }));
vi.mock('@/features/jobs/useJobStatusPolling', () => ({ useJobStatusPolling: () => {} }));

const epfCalls = vi.hoisted(() => ({ preview: vi.fn(), commit: vi.fn() }));
vi.mock('./useEpfImportMutations', () => ({
  useEpfImportMutations: () => ({
    previewMutation: { mutateAsync: epfCalls.preview },
    commitMutation: { mutateAsync: epfCalls.commit },
  }),
}));
const legacyCalls = vi.hoisted(() => ({ previewImport: vi.fn(), previewReconcile: vi.fn() }));
vi.mock('./useImportWizardMutations', () => ({
  useImportWizardMutations: () => ({
    previewImportMutation: { mutateAsync: legacyCalls.previewImport },
    previewReconcileMutation: { mutateAsync: legacyCalls.previewReconcile },
    commitImportMutation: { mutateAsync: vi.fn() },
    commitReconcileMutation: { mutateAsync: vi.fn() },
  }),
}));

const user = userEvent.setup({ pointerEventsCheck: 0 });
const pdf = new File(['%PDF'], 'Passbook_MHBAN0012345000067890_2026-27.pdf', { type: 'application/pdf' });

const row = (over: Partial<EpfPreview['rows'][number]>): EpfPreview['rows'][number] => ({
  index: 0,
  type: 'CONTRIBUTION',
  wageMonth: '2026-09-01',
  creditedOn: '2026-10-15',
  employeeAmount: 7200,
  employerAmount: 5950,
  pensionAmount: 1250,
  status: 'NEW',
  ...over,
});

const preview = (over: Partial<EpfPreview> = {}): EpfPreview => ({
  employer: { existingId: 'e1', name: 'Northwind Labs', memberId: 'MHBAN0012345000067890', establishmentId: 'MHBAN0012345', uanLast4: '4321', throughMonth: '2026-09-01' },
  rows: [
    row({ index: 0 }),
    row({ index: 1, type: 'INTEREST', wageMonth: null, interestFy: 2025, creditedOn: '2026-08-18', employeeAmount: 30000, employerAmount: 26180 }),
    row({ index: 2, wageMonth: '2026-08-01', status: 'REPLACES', replacesEntryId: 'x' }),
    row({ index: 3, wageMonth: '2026-07-01', status: 'EXISTS' }),
    row({ index: 4, type: 'OPENING_BALANCE', wageMonth: null, creditedOn: '2026-04-01', employeeAmount: 400000, employerAmount: 308130, status: 'EXISTS' }),
  ],
  newCount: 2,
  existsCount: 2,
  replacesCount: 1,
  unrecognisedLines: 0,
  employerOptions: [],
  ...over,
});

const result: EpfImportResult = { employerId: 'e1', employerName: 'Northwind Labs', imported: 2, replaced: 1, skipped: 2, balance: 843210, throughMonth: '2026-09-01' };

const pickType = async (label: RegExp | string) => {
  await user.click(screen.getByRole('combobox', { name: /Type|import type/ }));
  await user.click(await screen.findByRole('option', { name: label }));
};
const upload = () => user.upload(screen.getByTestId('epf-zone').querySelector('input[type="file"]') as HTMLInputElement, pdf);
const readPassbook = () => user.click(screen.getByRole('button', { name: 'Preview passbook' }));
const open = () => renderWithQuery(<ImportTradebookScreen brokers={[broker()]} initialMode="epf_passbook" />);
const apiError = (code: string, message: string) =>
  new ApiError(400, { code, message, timestamp: '2026-10-27T00:00:00Z' });

beforeEach(() => {
  vi.clearAllMocks();
  epfCalls.preview.mockResolvedValue(preview());
  epfCalls.commit.mockResolvedValue(result);
});

describe('EPF passbook import: choosing the type', () => {
  it('is a choice in the Type field and swaps the broker form for the passbook drop zone', async () => {
    renderWithQuery(<ImportTradebookScreen brokers={[broker()]} />);
    expect(screen.getByRole('combobox', { name: /Target broker account/ })).toBeInTheDocument();
    await pickType('EPF passbook (EPFO PDF)');
    expect(screen.queryByRole('combobox', { name: /Target broker account/ })).not.toBeInTheDocument();
    expect(screen.getByText('Drop your EPFO passbook PDF')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('EPF passbook (EPFO PDF)');
  });

  it('opens on the passbook when the page hands it the type, with no broker fields', () => {
    open();
    expect(screen.getByText('What are you importing?')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Target broker account/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview passbook' })).toBeDisabled();
  });

  it('leaves the other types as they were', async () => {
    renderWithQuery(<ImportTradebookScreen brokers={[broker()]} />);
    expect(screen.getByRole('button', { name: 'Preview reconciliation' })).toBeInTheDocument();
    expect(screen.getByTestId('taxpnl-zone')).toBeInTheDocument();
    await pickType(/Mutual funds CAS/);
    expect(screen.getByTestId('cas-zone')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Target broker account/ })).toBeInTheDocument();
    await pickType('EPF passbook (EPFO PDF)');
    await pickType(/Zerodha reconciliation/);
    expect(screen.getByTestId('taxpnl-zone')).toBeInTheDocument();
  });
});

describe('EPF passbook import: review', () => {
  it('reads the PDF and shows the counts, the pension note, the employer and each entry with its status', async () => {
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText(/5 entries in this passbook: 2 new, 1 replaces an entry you added, 2 are already here\./)).toBeInTheDocument();
    expect(screen.getByText(/Pension figures are kept but not added to the balance\./)).toBeInTheDocument();
    expect(epfCalls.preview).toHaveBeenCalledWith({ file: pdf, employerId: undefined });
    expect(screen.getByText('Northwind Labs · FY 2026-27')).toBeInTheDocument();
    expect(screen.getByText('Member ID …67890 · UAN …4321 · up to Sep 2026')).toBeInTheDocument();
    expect(screen.getAllByText('Sep 2026')[0]).toBeInTheDocument();
    expect(screen.getAllByText('FY 2025-26')[0]).toBeInTheDocument();
    expect(screen.getAllByText('1 Apr 2026')[0]).toBeInTheDocument();
    expect(screen.getByText('₹56,180')).toBeInTheDocument();
    expect(screen.getAllByText('₹13,150').length).toBeGreaterThan(0);
    expect(screen.getAllByText('New').length).toBeGreaterThan(0);
    expect(screen.getByText('Replaces the one you added')).toBeInTheDocument();
    expect(screen.getAllByText('Already here').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Import 3 entries' })).toBeEnabled();
  });

  it('says a new employer is added when the passbook has one and there is no choice to make', async () => {
    epfCalls.preview.mockResolvedValue(
      preview({ employer: { existingId: null, name: 'Fabrikam Ltd', memberId: 'MHBAN0099922011', uanLast4: '4321' } }),
    );
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText(/New employer in this passbook: Fabrikam Ltd \(member ID …22011\)\. Importing adds it to your employers\./)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Employer' })).not.toBeInTheDocument();
  });

  it('notes lines it could not read', async () => {
    epfCalls.preview.mockResolvedValue(preview({ unrecognisedLines: 3 }));
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText('3 lines in the passbook could not be read and will not be imported.')).toBeInTheDocument();
  });

  it('offers a disabled Import when everything is already here', async () => {
    epfCalls.preview.mockResolvedValue(preview({ newCount: 0, replacesCount: 0, existsCount: 5, rows: [row({ status: 'EXISTS' })] }));
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText(/5 entries in this passbook: 5 are already here\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 0 entries' })).toBeDisabled();
  });

  it('re-reads the passbook for the employer picked in the Employer select', async () => {
    epfCalls.preview.mockResolvedValue(
      preview({
        employer: { existingId: null, name: 'Fabrikam Ltd', memberId: 'MHBAN0099922011', uanLast4: '4321' },
        employerOptions: [{ id: 'e1', name: 'Northwind Labs' }],
      }),
    );
    open();
    await upload();
    await readPassbook();
    await screen.findByText(/in this passbook/);
    expect(screen.getByRole('combobox', { name: 'Employer' })).toHaveTextContent('New employer: Fabrikam Ltd');
    epfCalls.preview.mockResolvedValue(preview());
    await user.click(screen.getByRole('combobox', { name: 'Employer' }));
    await user.click(await screen.findByRole('option', { name: 'Northwind Labs' }));
    await waitFor(() => expect(epfCalls.preview).toHaveBeenLastCalledWith({ file: pdf, employerId: 'e1' }));
    // The select stays, showing the pick, so it can be undone.
    expect(screen.getByRole('combobox', { name: 'Employer' })).toHaveTextContent('Northwind Labs');
    epfCalls.preview.mockResolvedValue(
      preview({ employer: { existingId: null, name: 'Fabrikam Ltd', memberId: 'MHBAN0099922011', uanLast4: '4321' } }),
    );
    await user.click(screen.getByRole('combobox', { name: 'Employer' }));
    await user.click(await screen.findByRole('option', { name: 'New employer: Fabrikam Ltd' }));
    await waitFor(() => expect(epfCalls.preview).toHaveBeenLastCalledWith({ file: pdf, employerId: undefined }));
    expect(screen.getByRole('combobox', { name: 'Employer' })).toHaveTextContent('New employer: Fabrikam Ltd');
  });

  it('Back and Change file return to the upload with the file kept', async () => {
    open();
    await upload();
    await readPassbook();
    await screen.findByText(/in this passbook/);
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('EPF passbook (EPFO PDF)');
    expect(screen.getByText(pdf.name)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Drop your EPFO passbook PDF')).toBeInTheDocument();
    expect(screen.getByText(pdf.name)).toBeInTheDocument();
  });
});

describe('EPF passbook import: refused files', () => {
  it.each([
    ['NOT_A_PASSBOOK', 'This file is not an EPFO passbook. Download the passbook PDF from the EPFO site and try again.'],
    ['PASSWORD_PROTECTED', 'This PDF is password protected. Remove the password and upload it again.'],
    ['UNREADABLE', 'This passbook could not be read.'],
    ['UAN_MISMATCH', 'This passbook is for UAN …7788, but your EPF is UAN …4321. Upload the passbook for UAN …4321.'],
    ['VALIDATION_ERROR', 'Choose a PDF file.'],
  ])('shows the server message for %s in the upload step', async (code, message) => {
    epfCalls.preview.mockRejectedValue(apiError(code, message));
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText('Drop your EPFO passbook PDF')).toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('Choose another file clears the file and the message', async () => {
    epfCalls.preview.mockRejectedValue(apiError('NOT_A_PASSBOOK', 'Not a passbook.'));
    open();
    await upload();
    await readPassbook();
    await user.click(await screen.findByRole('button', { name: 'Choose another file' }));
    expect(screen.queryByText('Not a passbook.')).not.toBeInTheDocument();
    expect(screen.queryByText(pdf.name)).not.toBeInTheDocument();
  });

  it('toasts any other failure', async () => {
    epfCalls.preview.mockRejectedValue(apiError('NETWORK_ERROR', 'Network error'));
    open();
    await upload();
    await readPassbook();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Failed to preview import: Network error', { tone: 'danger' }));
  });
});

describe('EPF passbook import: result', () => {
  it('commits the same file and employer, then shows what went in with Open EPF', async () => {
    open();
    await upload();
    await readPassbook();
    await user.click(await screen.findByRole('button', { name: 'Import 3 entries' }));
    expect(await screen.findByRole('heading', { name: 'Imported 3 entries' })).toBeInTheDocument();
    expect(epfCalls.commit).toHaveBeenCalledWith({ file: pdf, employerId: 'e1' });
    expect(screen.getByText('2 new and 1 replaced. EPF balance is now ₹8,43,210, up to Sep 2026.')).toBeInTheDocument();
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Open EPF' })).toHaveAttribute('href', '/investments/epf');
  });

  it('Import another starts over', async () => {
    open();
    await upload();
    await readPassbook();
    await user.click(await screen.findByRole('button', { name: 'Import 3 entries' }));
    await user.click(await screen.findByRole('button', { name: 'Import another' }));
    expect(screen.getByText('Drop your EPFO passbook PDF')).toBeInTheDocument();
    expect(screen.queryByText(pdf.name)).not.toBeInTheDocument();
  });

  it('does not refresh the router when the commit fails', async () => {
    epfCalls.commit.mockRejectedValue(apiError('INTERNAL_ERROR', 'Boom'));
    open();
    await upload();
    await readPassbook();
    await user.click(await screen.findByRole('button', { name: 'Import 3 entries' }));
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(mockRouter.refresh).not.toHaveBeenCalled();
  });

  it('toasts a failed commit and stays on the review', async () => {
    epfCalls.commit.mockRejectedValue(apiError('INTERNAL_ERROR', 'Boom'));
    open();
    await upload();
    await readPassbook();
    await user.click(await screen.findByRole('button', { name: 'Import 3 entries' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Failed to commit import: Boom', { tone: 'danger' }));
    expect(within(document.body).getByRole('button', { name: 'Import 3 entries' })).toBeEnabled();
  });
});
