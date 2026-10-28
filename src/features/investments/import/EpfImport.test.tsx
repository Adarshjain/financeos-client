import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { mockRouter } from '@/test/next-mocks';
import { renderWithQuery } from '@/test/renderWithQuery';

import type { EpfBatchPreview, EpfBatchResult, EpfPreview } from './epfImportModel';
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
  matchedOpeningCount: 0,
  unrecognisedLines: 0,
  employerOptions: [],
  ...over,
});

const oneSection = (p: EpfPreview): EpfBatchPreview => ({ sections: [{ key: 'k1', fileNames: [pdf.name], preview: p }], refused: [] });
const result: EpfBatchResult = {
  results: [{ employerId: 'e1', employerName: 'Northwind Labs', imported: 2, replaced: 1, skipped: 2, balance: 843210, throughMonth: '2026-09-01' }],
  imported: 2,
  replaced: 1,
  skipped: 2,
  balance: 843210,
  refused: [],
};

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
  epfCalls.preview.mockResolvedValue(oneSection(preview()));
  epfCalls.commit.mockResolvedValue(result);
});

describe('EPF passbook import: choosing the type', () => {
  it('is a choice in the Type field and swaps the broker form for the passbook drop zone', async () => {
    renderWithQuery(<ImportTradebookScreen brokers={[broker()]} />);
    expect(screen.getByRole('combobox', { name: /Target broker account/ })).toBeInTheDocument();
    await pickType('EPF passbook (EPFO PDF)');
    expect(screen.queryByRole('combobox', { name: /Target broker account/ })).not.toBeInTheDocument();
    expect(screen.getByText('Drop your EPFO passbook PDFs')).toBeInTheDocument();
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

describe('EPF passbook import: switching type', () => {
  it('drops the passbook files and preview, so coming back starts empty', async () => {
    open();
    await upload();
    await readPassbook();
    await screen.findByText(/in this passbook/);
    await pickType(/Zerodha reconciliation/);
    await pickType('EPF passbook (EPFO PDF)');
    expect(screen.getByText('Drop your EPFO passbook PDFs')).toBeInTheDocument();
    expect(screen.queryByText(pdf.name)).not.toBeInTheDocument();
    expect(screen.queryByText(/in this passbook/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview passbook' })).toBeDisabled();
  });
});

describe('EPF passbook import: review', () => {
  it('reads the PDF and shows the counts, the pension note, the employer and each entry with its status', async () => {
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText(/5 entries in this passbook: 2 new, 1 replaces an entry you added, 2 are already here\./)).toBeInTheDocument();
    expect(screen.getByText(/Pension figures are kept but not added to the balance\./)).toBeInTheDocument();
    expect(epfCalls.preview).toHaveBeenCalledWith({ files: [pdf], assign: [] });
    expect(screen.getByText('Northwind Labs · FY 2026-27')).toBeInTheDocument();
    expect(screen.getByText('Member ID …67890 · UAN …4321 · up to September 2026')).toBeInTheDocument();
    expect(screen.getAllByText('September 2026')[0]).toBeInTheDocument();
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
    epfCalls.preview.mockResolvedValue(oneSection(
      preview({ employer: { existingId: null, name: 'Fabrikam Ltd', memberId: 'MHBAN0099922011', uanLast4: '4321' } }),
    ));
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText(/New employer in this passbook: Fabrikam Ltd \(member ID …22011\)\. Importing adds it to your employers\./)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Employer' })).not.toBeInTheDocument();
  });

  it('notes lines it could not read', async () => {
    epfCalls.preview.mockResolvedValue(oneSection(preview({ unrecognisedLines: 3 })));
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText('3 lines in the passbook could not be read and will not be imported.')).toBeInTheDocument();
  });

  it('flags an opening balance that does not match the entries, on its row and as a section warning', async () => {
    const ob = row({ index: 5, type: 'OPENING_BALANCE', wageMonth: null, creditedOn: '2026-04-01', employeeAmount: 400000, employerAmount: 300000, status: 'NEW', computedEmployeeAmount: 390000, computedEmployerAmount: 290000 });
    epfCalls.preview.mockResolvedValue(oneSection(preview({ rows: [ob] })));
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText('Your entries come to ₹6,80,000, EPFO says ₹7,00,000')).toBeInTheDocument();
    expect(screen.getByText("1 opening balance does not match your entries. Importing keeps EPFO's figure as a correction.")).toBeInTheDocument();
  });

  it('offers a disabled Import when everything is already here', async () => {
    epfCalls.preview.mockResolvedValue(oneSection(preview({ newCount: 0, replacesCount: 0, existsCount: 5, rows: [row({ status: 'EXISTS' })] })));
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText(/5 entries in this passbook: 5 are already here\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 0 entries' })).toBeDisabled();
  });

  it('re-reads the passbook for the employer picked in the Employer select', async () => {
    epfCalls.preview.mockResolvedValue(oneSection(
      preview({
        employer: { existingId: null, name: 'Fabrikam Ltd', memberId: 'MHBAN0099922011', uanLast4: '4321' },
        employerOptions: [{ id: 'e1', name: 'Northwind Labs' }],
      }),
    ));
    open();
    await upload();
    await readPassbook();
    await screen.findByText(/in this passbook/);
    expect(screen.getByRole('combobox', { name: 'Employer' })).toHaveTextContent('New employer: Fabrikam Ltd');
    epfCalls.preview.mockResolvedValue(oneSection(preview()));
    await user.click(screen.getByRole('combobox', { name: 'Employer' }));
    await user.click(await screen.findByRole('option', { name: 'Northwind Labs' }));
    await waitFor(() => expect(epfCalls.preview).toHaveBeenLastCalledWith({ files: [pdf], assign: ['k1=e1'] }));
    // The select stays, showing the pick, so it can be undone.
    expect(screen.getByRole('combobox', { name: 'Employer' })).toHaveTextContent('Northwind Labs');
    epfCalls.preview.mockResolvedValue(oneSection(
      preview({ employer: { existingId: null, name: 'Fabrikam Ltd', memberId: 'MHBAN0099922011', uanLast4: '4321' } }),
    ));
    await user.click(screen.getByRole('combobox', { name: 'Employer' }));
    await user.click(await screen.findByRole('option', { name: 'New employer: Fabrikam Ltd' }));
    await waitFor(() => expect(epfCalls.preview).toHaveBeenLastCalledWith({ files: [pdf], assign: [] }));
    expect(screen.getByRole('combobox', { name: 'Employer' })).toHaveTextContent('New employer: Fabrikam Ltd');
  });

  it('Back returns to the upload with the file kept', async () => {
    open();
    await upload();
    await readPassbook();
    await screen.findByText(/in this passbook/);
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('EPF passbook (EPFO PDF)');
    expect(screen.queryByRole('button', { name: 'Change file' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Drop your EPFO passbook PDFs')).toBeInTheDocument();
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
    expect(screen.getByText('Drop your EPFO passbook PDFs')).toBeInTheDocument();
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
  it('commits the same files and employer, then shows what went in with Open EPF', async () => {
    open();
    await upload();
    await readPassbook();
    await user.click(await screen.findByRole('button', { name: 'Import 3 entries' }));
    expect(await screen.findByRole('heading', { name: 'Imported 3 entries' })).toBeInTheDocument();
    expect(epfCalls.commit).toHaveBeenCalledWith({ files: [pdf], assign: [] });
    expect(screen.getByText('2 new and 1 replaced. EPF balance is now ₹8,43,210, up to September 2026.')).toBeInTheDocument();
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Open EPF' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/investments/epf');
  });

  it('Import another starts over', async () => {
    open();
    await upload();
    await readPassbook();
    await user.click(await screen.findByRole('button', { name: 'Import 3 entries' }));
    await user.click(await screen.findByRole('button', { name: 'Import another' }));
    expect(screen.getByText('Drop your EPFO passbook PDFs')).toBeInTheDocument();
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

describe('EPF passbook import: several passbooks', () => {
  const pdf2 = new File(['%PDF2'], 'Passbook_MHBAN0099922011_2026-27.pdf', { type: 'application/pdf' });
  const pdf3 = new File(['%PDF3'], 'Passbook_MHBAN0012345000067890_2025-26.pdf', { type: 'application/pdf' });
  const input = () => screen.getByTestId('epf-zone').querySelector('input[type="file"]') as HTMLInputElement;
  const second = () =>
    preview({
      employer: { existingId: 'e2', name: 'Fabrikam Ltd', memberId: 'MHBAN0099922011', uanLast4: '4321', throughMonth: '2026-06-01' },
      rows: [row({ index: 0, wageMonth: '2026-06-01' })],
      newCount: 1,
      existsCount: 0,
      replacesCount: 0,
    });
  const twoSections = (over: Partial<EpfBatchPreview> = {}): EpfBatchPreview => ({
    sections: [
      { key: 'k1', fileNames: [pdf.name, pdf3.name], preview: preview() },
      { key: 'k2', fileNames: [pdf2.name], preview: second() },
    ],
    refused: [],
    ...over,
  });

  it('shows one block per section with its own table, and the file names only for a section from several files', async () => {
    epfCalls.preview.mockResolvedValue(twoSections());
    open();
    await user.upload(input(), [pdf, pdf3, pdf2]);
    expect(screen.getByRole('button', { name: 'Preview passbooks' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Preview passbooks' }));
    expect(await screen.findByText('Northwind Labs · FY 2026-27')).toBeInTheDocument();
    expect(screen.getByText('Fabrikam Ltd · FY 2026-27')).toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(2);
    expect(epfCalls.preview).toHaveBeenCalledWith({ files: [pdf, pdf3, pdf2], assign: [] });
    expect(screen.getByText(`From ${pdf.name}, ${pdf3.name}`)).toBeInTheDocument();
    expect(screen.queryByText(`From ${pdf2.name}`)).not.toBeInTheDocument();
    expect(screen.queryByText('Change file')).not.toBeInTheDocument();
    // 3 importable in the first section plus 1 in the second.
    expect(screen.getByRole('button', { name: 'Import 4 entries' })).toBeEnabled();
  });

  it('lists the files that were not imported in a warning above the sections', async () => {
    epfCalls.preview.mockResolvedValue(twoSections({ refused: [{ fileName: 'notes.pdf', code: 'NOT_A_PASSBOOK', message: 'Not an EPFO passbook.' }] }));
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText('Not imported: notes.pdf (Not an EPFO passbook.)')).toBeInTheDocument();
    expect(screen.getByText('Fabrikam Ltd · FY 2026-27')).toBeInTheDocument();
  });

  it('stays on the upload with a danger banner per refused file when none can be read; Choose other files clears the queue', async () => {
    epfCalls.preview.mockResolvedValue({
      sections: [],
      refused: [
        { fileName: 'a.pdf', code: 'NOT_A_PASSBOOK', message: 'Not a passbook.' },
        { fileName: 'b.pdf', code: 'PASSWORD_PROTECTED', message: 'Password protected.' },
      ],
    });
    open();
    await upload();
    await readPassbook();
    expect(await screen.findByText('a.pdf: Not a passbook.')).toBeInTheDocument();
    expect(screen.getByText('b.pdf: Password protected.')).toBeInTheDocument();
    expect(screen.getByText('Drop your EPFO passbook PDFs')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Choose other files' }));
    expect(screen.queryByText('a.pdf: Not a passbook.')).not.toBeInTheDocument();
    expect(screen.queryByText(pdf.name)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview passbook' })).toBeDisabled();
  });

  it('sends assign for every section with a picked employer when one section changes', async () => {
    const withChoices = (key: string, name: string, memberId: string) => ({
      key,
      fileNames: [`${key}.pdf`],
      preview: preview({ employer: { existingId: null, name, memberId, uanLast4: '4321' }, employerOptions: [{ id: 'e1', name: 'Northwind Labs' }, { id: 'e2', name: 'Fabrikam Ltd' }] }),
    });
    epfCalls.preview.mockResolvedValue({ sections: [withChoices('k1', 'Alpha Co', 'MH00000011111'), withChoices('k2', 'Beta Co', 'MH00000022222')], refused: [] });
    open();
    await upload();
    await readPassbook();
    const selects = await screen.findAllByRole('combobox', { name: 'Employer' });
    expect(selects).toHaveLength(2);
    epfCalls.preview.mockResolvedValue({
      sections: [{ ...withChoices('k1', 'Alpha Co', 'MH00000011111'), preview: preview() }, withChoices('k2', 'Beta Co', 'MH00000022222')],
      refused: [],
    });
    await user.click(selects[0]);
    await user.click(await screen.findByRole('option', { name: 'Northwind Labs' }));
    await waitFor(() => expect(epfCalls.preview).toHaveBeenLastCalledWith({ files: [pdf], assign: ['k1=e1'] }));
    // A second pick sends both.
    epfCalls.preview.mockResolvedValue({
      sections: [
        { ...withChoices('k1', 'Alpha Co', 'MH00000011111'), preview: preview() },
        { ...withChoices('k2', 'Beta Co', 'MH00000022222'), preview: second() },
      ],
      refused: [],
    });
    await user.click(screen.getAllByRole('combobox', { name: 'Employer' })[1]);
    await user.click(await screen.findByRole('option', { name: 'Fabrikam Ltd' }));
    await waitFor(() => expect(epfCalls.preview).toHaveBeenLastCalledWith({ files: [pdf], assign: ['k1=e1', 'k2=e2'] }));
  });

  it('shows a server refusal of a pick as a toast and keeps the previous preview', async () => {
    epfCalls.preview.mockResolvedValue(
      oneSection(preview({ employer: { existingId: null, name: 'Fabrikam Ltd', memberId: 'MHBAN0099922011', uanLast4: '4321' }, employerOptions: [{ id: 'e1', name: 'Northwind Labs' }] })),
    );
    open();
    await upload();
    await readPassbook();
    await screen.findByRole('combobox', { name: 'Employer' });
    epfCalls.preview.mockRejectedValue(apiError('VALIDATION_ERROR', 'Two passbooks cannot go under one employer.'));
    await user.click(screen.getByRole('combobox', { name: 'Employer' }));
    await user.click(await screen.findByRole('option', { name: 'Northwind Labs' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Failed to preview import: Two passbooks cannot go under one employer.', { tone: 'danger' }));
    expect(screen.getByRole('combobox', { name: 'Employer' })).toHaveTextContent('New employer: Fabrikam Ltd');
  });

  it('totals the result across employers', async () => {
    epfCalls.preview.mockResolvedValue(twoSections());
    epfCalls.commit.mockResolvedValue({
      results: [
        { employerId: 'e1', employerName: 'Northwind Labs', imported: 2, replaced: 1, skipped: 2, balance: 800000, throughMonth: '2026-09-01' },
        { employerId: 'e2', employerName: 'Fabrikam Ltd', imported: 1, replaced: 0, skipped: 0, balance: 43210, throughMonth: '2026-06-01' },
      ],
      imported: 3,
      replaced: 1,
      skipped: 2,
      balance: 843210,
      refused: [],
    });
    open();
    await upload();
    await readPassbook();
    await user.click(await screen.findByRole('button', { name: 'Import 4 entries' }));
    expect(await screen.findByRole('heading', { name: 'Imported 4 entries' })).toBeInTheDocument();
    expect(screen.getByText('3 new and 1 replaced across 2 employers. EPF balance is now ₹8,43,210, up to September 2026.')).toBeInTheDocument();
    expect(epfCalls.commit).toHaveBeenCalledWith({ files: [pdf], assign: [] });
  });

  it('queues files side by side, removes one at a time, and does not queue the same file twice', async () => {
    open();
    await user.upload(input(), [pdf, pdf2]);
    await user.upload(input(), [pdf]);
    expect(screen.getAllByText(pdf.name)).toHaveLength(1);
    expect(screen.getByText(pdf2.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview passbooks' })).toBeEnabled();
    await user.click(screen.getAllByRole('button', { name: /Remove/ })[0]);
    expect(screen.queryByText(pdf.name)).not.toBeInTheDocument();
    expect(screen.getByText(pdf2.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview passbook' })).toBeEnabled();
  });

  it('refuses a 13th file and a queue over the size cap', async () => {
    open();
    const many = Array.from({ length: 13 }, (_, i) => new File([`%PDF${i}`], `p${i}.pdf`, { type: 'application/pdf' }));
    await user.upload(input(), many);
    expect(screen.getByText(/You can import up to 12 passbooks at a time/)).toBeInTheDocument();
    expect(screen.queryByText('p12.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('p11.pdf')).toBeInTheDocument();
  });

  it('refuses files past the total size cap', async () => {
    open();
    const big = new File([new Uint8Array(26 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
    await user.upload(input(), big);
    expect(screen.getByText(/the limit is 25MB per upload/)).toBeInTheDocument();
    expect(screen.queryByText('big.pdf')).not.toBeInTheDocument();
  });
});
