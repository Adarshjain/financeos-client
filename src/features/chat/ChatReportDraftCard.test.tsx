import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import type { ChatReportDraft } from './chat.types';
import { ChatReportDraftCard, type ChatReportDraftCardProps } from './ChatReportDraftCard';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
vi.mock('@/features/reports/view/ReportResult', () => ({
  ReportResult: ({ catalog }: { catalog?: { fields: { label: string }[] } }) => (
    <>
      <div>preview result</div>
      {catalog ? <div>{`labels: ${catalog.fields.map((f) => f.label).join(', ')}`}</div> : null}
    </>
  ),
}));
// The report catalog: where the preview's field labels and formats come from.
const catalog = vi.hoisted(() => ({ state: { data: undefined as unknown, isPending: false } }));
vi.mock('@/features/dashboards/frame/useReportCatalog', () => ({ useReportCatalog: () => catalog.state }));
const CATALOG = {
  datasources: [
    { name: 'accounts', label: 'Accounts', fields: [{ name: 'accountType', label: 'Account Type' }] },
    { name: 'transactions', label: 'Transactions', fields: [{ name: 'category', label: 'Category' }, { name: 'amount', label: 'Amount' }] },
  ],
  operators: {},
};

const remember = vi.hoisted(() => vi.fn());
vi.mock('./conversationActions', () => ({ saveDraftResult: remember }));
const actions = vi.hoisted(() => ({
  runDraftPreview: vi.fn(),
  saveDraftAsReport: vi.fn(),
  getReport: vi.fn(),
  getReportSummary: vi.fn(),
  applyDraftUpdate: vi.fn(),
  restoreReport: vi.fn(),
  removeReport: vi.fn(),
  addReportWidget: vi.fn(),
  createHomeWithReport: vi.fn(),
  removeDashboard: vi.fn(),
  removeWidgetFrom: vi.fn(),
}));
vi.mock('./draftActions', () => actions);
// list null = the dashboards query has not loaded yet.
const dash = vi.hoisted(() => ({ list: [] as { id: string; isDefault: boolean }[] | null }));
vi.mock('@/lib/query/hooks/useDashboards', () => ({
  useDashboards: () => ({ data: dash.list ?? undefined, isSuccess: dash.list !== null }),
  storeSavedDashboard: vi.fn(),
}));

const create: ChatReportDraft = {
  mode: 'create',
  name: 'Monthly spend by category',
  description: 'last 12 months, top 5 categories and the rest',
  type: 'CHART',
  datasource: 'transactions',
  definition: { x: 1 },
};

function setup(draft: ChatReportDraft = create, over: Partial<ChatReportDraftCardProps> = {}) {
  return renderWithQuery(<ChatReportDraftCard draft={draft} conversationId="c1" messageId="m1" {...over} />);
}

const undoToast = () => toast.mock.calls.at(-1)?.[1]?.action as { label: string; onSelect: () => void };

beforeEach(() => {
  vi.clearAllMocks();
  remember.mockResolvedValue({ success: true, data: undefined });
  dash.list = [{ id: 'd1', isDefault: true }];
  catalog.state = { data: CATALOG, isPending: false };
  actions.runDraftPreview.mockResolvedValue({ type: 'CHART' });
  actions.saveDraftAsReport.mockResolvedValue({ id: 'r1', name: 'Monthly spend by category', type: 'CHART' });
  actions.addReportWidget.mockResolvedValue({ saved: { id: 'd1' }, widgetId: 'w1' });
  actions.removeWidgetFrom.mockResolvedValue({ id: 'd1' });
  actions.removeReport.mockResolvedValue(undefined);
  actions.createHomeWithReport.mockResolvedValue({ saved: { id: 'h1' }, widgetId: 'w9' });
  actions.removeDashboard.mockResolvedValue(undefined);
  actions.getReport.mockResolvedValue({ id: 'r1', name: 'Old name', description: null, type: 'CHART', definition: { old: true } });
  actions.applyDraftUpdate.mockResolvedValue(undefined);
  actions.restoreReport.mockResolvedValue(undefined);
  actions.getReportSummary.mockResolvedValue({ id: 'r1', name: 'Swiggy in October', dashboards: [{ id: 'd1', name: 'Home' }] });
});

describe('create draft', () => {
  it("labels the preview with the draft's datasource fields from the report catalog", async () => {
    setup();
    expect(await screen.findByText('labels: Category, Amount')).toBeInTheDocument();
  });

  it('shows a skeleton, not raw field names, until the catalog is in', async () => {
    catalog.state = { data: undefined, isPending: true };
    const { container, rerender } = setup();
    await waitFor(() => expect(actions.runDraftPreview).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('preview result')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
    catalog.state = { data: CATALOG, isPending: false };
    rerender(<ChatReportDraftCard draft={create} conversationId="c1" messageId="m1" />);
    expect(await screen.findByText('labels: Category, Amount')).toBeInTheDocument();
  });

  it('still shows the preview, unlabelled, when the catalog could not load', async () => {
    catalog.state = { data: undefined, isPending: false };
    setup();
    expect(await screen.findByText('preview result')).toBeInTheDocument();
    expect(screen.queryByText(/^labels:/)).not.toBeInTheDocument();
  });

  it('shows Report draft, the title, the caption, the preview and both actions', async () => {
    setup();
    expect(screen.getByText('Report draft')).toBeInTheDocument();
    expect(screen.getByText('Monthly spend by category')).toBeInTheDocument();
    expect(screen.getByText('Chart · Transactions · last 12 months, top 5 categories and the rest')).toBeInTheDocument();
    expect(await screen.findByText('preview result')).toBeInTheDocument();
    expect(actions.runDraftPreview).toHaveBeenCalledWith(expect.objectContaining({ type: 'CHART', datasource: 'transactions', definition: { x: 1 } }));
    expect(screen.getByRole('button', { name: 'Add to Home' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save as report' })).toBeEnabled();
  });

  it('keeps the actions off while the preview runs and when it fails, and says why', async () => {
    actions.runDraftPreview.mockRejectedValue(new Error('x'));
    setup();
    expect(screen.getByRole('button', { name: 'Save as report' })).toBeDisabled();
    expect(await screen.findByText("Couldn't load the preview.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as report' })).toBeDisabled();
  });

  it('Retry re-runs a failed preview and enables Save', async () => {
    actions.runDraftPreview.mockRejectedValueOnce(new Error('x'));
    setup();
    await screen.findByText("Couldn't load the preview.");
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('preview result')).toBeInTheDocument();
    expect(actions.runDraftPreview).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Save as report' })).toBeEnabled();
  });

  it('does not re-run the preview when only the draft object changes', async () => {
    const { rerender } = setup();
    await screen.findByText('preview result');
    rerender(<ChatReportDraftCard draft={{ ...create, definition: { x: 1 } }} conversationId="c1" messageId="m1" />);
    expect(actions.runDraftPreview).toHaveBeenCalledTimes(1);
  });

  it('shows Add to Home without a default dashboard and creates Home with just the widget', async () => {
    dash.list = [{ id: 'd2', isDefault: false }];
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Add to Home' }));
    expect(await screen.findByText(/^Report saved and added to Home/)).toBeInTheDocument();
    expect(actions.createHomeWithReport).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }));
    expect(actions.addReportWidget).not.toHaveBeenCalled();
    expect(remember).toHaveBeenCalledWith('c1', 'm1', { action: 'saved-home', reportId: 'r1', reportName: 'Monthly spend by category', widgetId: 'w9', dashboardId: 'h1', createdDashboard: true });
    expect(toast).toHaveBeenCalledWith('Report saved and added to Home', expect.anything());
  });

  it('keeps Add to Home off until the dashboards list has loaded, so no second Home is made', async () => {
    dash.list = null;
    setup();
    await screen.findByText('preview result');
    expect(screen.getByRole('button', { name: 'Add to Home' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save as report' })).toBeEnabled();
  });

  it('Undo of a created Home deletes the dashboard and the report', async () => {
    dash.list = [];
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Add to Home' }));
    await screen.findByText(/^Report saved and added to Home/);
    undoToast().onSelect();
    expect(await screen.findByRole('button', { name: 'Add to Home' })).toBeInTheDocument();
    expect(actions.removeDashboard).toHaveBeenCalledWith('h1');
    expect(actions.removeWidgetFrom).not.toHaveBeenCalled();
    expect(actions.removeReport).toHaveBeenCalledWith('r1');
    expect(remember).toHaveBeenLastCalledWith('c1', 'm1', { action: 'undone' });
  });

  it('draws nothing for a draft without its definition', () => {
    const { container } = setup({ mode: 'create', name: 'x' });
    expect(container).toBeEmptyDOMElement();
  });

  it('Save as report saves, shows Report saved with Open report, keeps the outcome and toasts with Undo', async () => {
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Save as report' }));
    expect(await screen.findByText(/^Report saved/)).toBeInTheDocument();
    expect(actions.saveDraftAsReport).toHaveBeenCalledWith(create);
    expect(actions.addReportWidget).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Open report' })).toHaveAttribute('href', '/reports/r1');
    expect(remember).toHaveBeenCalledWith('c1', 'm1', { action: 'saved', reportId: 'r1', reportName: 'Monthly spend by category' });
    expect(toast).toHaveBeenCalledWith('Report saved', expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }));
    expect(screen.queryByRole('button', { name: 'Save as report' })).toBeNull();
  });

  it('the toast Undo deletes the report and brings the actions back', async () => {
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Save as report' }));
    await screen.findByText(/^Report saved/);
    undoToast().onSelect();
    expect(await screen.findByRole('button', { name: 'Save as report' })).toBeInTheDocument();
    expect(actions.removeReport).toHaveBeenCalledWith('r1');
    expect(remember).toHaveBeenLastCalledWith('c1', 'm1', { action: 'undone' });
  });

  it('Add to Home saves the report, adds the widget and says both', async () => {
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Add to Home' }));
    expect(await screen.findByText(/^Report saved and added to Home/)).toBeInTheDocument();
    expect(actions.addReportWidget).toHaveBeenCalledWith('d1', expect.objectContaining({ id: 'r1' }));
    expect(actions.createHomeWithReport).not.toHaveBeenCalled();
    expect(remember).toHaveBeenCalledWith('c1', 'm1', { action: 'saved-home', reportId: 'r1', reportName: 'Monthly spend by category', widgetId: 'w1', dashboardId: 'd1' });
    expect(toast).toHaveBeenCalledWith('Report saved and added to Home', expect.anything());
  });

  it('the card Undo after Add to Home removes the widget, then the report', async () => {
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Add to Home' }));
    await screen.findByText(/^Report saved and added to Home/);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('button', { name: 'Add to Home' })).toBeInTheDocument();
    expect(actions.removeWidgetFrom).toHaveBeenCalledWith('d1', 'w1');
    expect(actions.removeReport).toHaveBeenCalledWith('r1');
    expect(actions.removeWidgetFrom.mock.invocationCallOrder[0]).toBeLessThan(actions.removeReport.mock.invocationCallOrder[0]);
  });

  it('keeps the saved report when only the widget could not be added, and says so', async () => {
    actions.addReportWidget.mockRejectedValue(new Error('nope'));
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Add to Home' }));
    expect(await screen.findByText(/^Report saved/)).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("Report saved, but couldn't add it to Home.", { tone: 'danger' });
    expect(remember).toHaveBeenCalledWith('c1', 'm1', expect.objectContaining({ action: 'saved' }));
  });

  it('shows what failed in a banner and keeps the actions', async () => {
    actions.saveDraftAsReport.mockRejectedValue(new ApiError(409, { code: 'CONFLICT', message: 'A report with this name exists' }));
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Save as report' }));
    expect(await screen.findByText('A report with this name exists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as report' })).toBeEnabled();
    expect(remember).not.toHaveBeenCalled();
  });
});

describe('guards', () => {
  it('ignores a second Undo while one is running', async () => {
    let finish!: () => void;
    actions.removeReport.mockImplementation(() => new Promise<void>((r) => (finish = r)));
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Save as report' }));
    await screen.findByText(/^Report saved/);
    undoToast().onSelect();
    undoToast().onSelect();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(actions.removeReport).toHaveBeenCalledTimes(1));
    finish();
    expect(await screen.findByRole('button', { name: 'Save as report' })).toBeInTheDocument();
  });

  it('treats a report that is already gone as undone', async () => {
    actions.removeReport.mockRejectedValue(new ApiError(404, { code: 'NOT_FOUND', message: 'gone' }));
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Save as report' }));
    await screen.findByText(/^Report saved/);
    undoToast().onSelect();
    expect(await screen.findByRole('button', { name: 'Save as report' })).toBeInTheDocument();
    expect(remember).toHaveBeenLastCalledWith('c1', 'm1', { action: 'undone' });
  });

  it('says so when the outcome could not be saved in the chat', async () => {
    remember.mockResolvedValue({ success: false, error: { message: 'x' } });
    setup();
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Save as report' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Couldn't save this in the chat. After a reload the draft may show its actions again.", { tone: 'danger' }),
    );
    expect(screen.getByText(/^Report saved/)).toBeInTheDocument();
  });

  it('refetches the dashboards after a delete and after undoing a save', async () => {
    const { queryClient } = setup({ mode: 'delete', reportId: 'r1', name: 'Swiggy in October' });
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    fireEvent.click(screen.getByRole('button', { name: 'Delete report' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Delete' })).at(-1)!);
    await screen.findByText(/^Report deleted/);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['dashboards'] });
  });

  it('refetches the dashboards after undoing a save to Home', async () => {
    const { queryClient } = setup();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Add to Home' }));
    await screen.findByText(/^Report saved and added to Home/);
    spy.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await screen.findByRole('button', { name: 'Add to Home' });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['dashboards'] });
  });
});

describe('a stored outcome', () => {
  it('shows the saved state when the conversation is reopened, and Undo still works from the stored ids', async () => {
    setup(create, { draftResult: { action: 'saved-home', reportId: 'r1', widgetId: 'w1', dashboardId: 'd1' } });
    expect(screen.getByText(/^Report saved and added to Home/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open report' })).toHaveAttribute('href', '/reports/r1');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(actions.removeWidgetFrom).toHaveBeenCalledWith('d1', 'w1'));
    expect(await screen.findByRole('button', { name: 'Save as report' })).toBeInTheDocument();
  });

  it('an undone outcome shows the actions again', () => {
    setup(create, { draftResult: { action: 'undone' } });
    expect(screen.getByRole('button', { name: 'Save as report' })).toBeInTheDocument();
  });
});

describe('update draft', () => {
  const update: ChatReportDraft = { ...create, mode: 'update', reportId: 'r1', name: 'New name' };

  it('shows Change to your report with the Updates line and an Update report button', async () => {
    setup(update);
    expect(screen.getByText('Change to your report')).toBeInTheDocument();
    expect(screen.getByText('Updates “New name”')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save as report' })).toBeNull();
    await screen.findByText('preview result');
  });

  it('updates the report after keeping its earlier version, and Undo restores that version', async () => {
    setup(update);
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Update report' }));
    expect(await screen.findByText(/^Report updated/)).toBeInTheDocument();
    expect(actions.getReport.mock.invocationCallOrder[0]).toBeLessThan(actions.applyDraftUpdate.mock.invocationCallOrder[0]);
    expect(actions.applyDraftUpdate).toHaveBeenCalledWith('r1', update);
    expect(remember).toHaveBeenCalledWith('c1', 'm1', { action: 'updated', reportId: 'r1', reportName: 'New name' });
    expect(screen.getByRole('link', { name: 'Open report' })).toHaveAttribute('href', '/reports/r1');
    undoToast().onSelect();
    await waitFor(() => expect(actions.restoreReport).toHaveBeenCalledWith(expect.objectContaining({ name: 'Old name' })));
    expect(await screen.findByRole('button', { name: 'Update report' })).toBeInTheDocument();
  });

  it('offers no Undo for an update seen again after a reload (the earlier version is gone)', () => {
    setup(update, { draftResult: { action: 'updated', reportId: 'r1' } });
    expect(screen.getByText(/^Report updated/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('shows what failed and keeps the button', async () => {
    actions.applyDraftUpdate.mockRejectedValue(new ApiError(404, { code: 'NOT_FOUND', message: 'Report not found' }));
    setup(update);
    await screen.findByText('preview result');
    fireEvent.click(screen.getByRole('button', { name: 'Update report' }));
    expect(await screen.findByText('Report not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update report' })).toBeEnabled();
  });
});

describe('delete draft', () => {
  const del: ChatReportDraft = { mode: 'delete', reportId: 'r1', name: 'Swiggy in October' };

  it('shows Delete report, the name and how many dashboards the widget leaves, with no preview', async () => {
    setup(del);
    expect(screen.getByText('Delete report', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Swiggy in October')).toBeInTheDocument();
    expect(await screen.findByText('It is on 1 dashboard. Its widget goes with it.')).toBeInTheDocument();
    expect(actions.runDraftPreview).not.toHaveBeenCalled();
  });

  it('asks first, says what goes and what stays, and deletes only on confirm', async () => {
    setup(del);
    fireEvent.click(screen.getByRole('button', { name: 'Delete report' }));
    expect(await screen.findByText('Delete “Swiggy in October”?')).toBeInTheDocument();
    expect(screen.getByText("The report and its widget on Home go. Your transactions stay. This can't be undone.")).toBeInTheDocument();
    expect(actions.removeReport).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!);
    expect(await screen.findByText(/^Report deleted/)).toBeInTheDocument();
    expect(actions.removeReport).toHaveBeenCalledWith('r1');
    expect(remember).toHaveBeenCalledWith('c1', 'm1', { action: 'deleted', reportId: 'r1', reportName: 'Swiggy in October' });
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('cancelling deletes nothing', async () => {
    setup(del);
    fireEvent.click(screen.getByRole('button', { name: 'Delete report' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(actions.removeReport).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete report' })).toBeInTheDocument();
  });

  it('shows what failed in the card and keeps the button', async () => {
    actions.removeReport.mockRejectedValue(new ApiError(409, { code: 'CONFLICT', message: 'Report is in use' }));
    setup(del);
    fireEvent.click(screen.getByRole('button', { name: 'Delete report' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Delete' })).at(-1)!);
    expect(await screen.findByText('Report is in use')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete report' })).toBeInTheDocument();
  });
});
