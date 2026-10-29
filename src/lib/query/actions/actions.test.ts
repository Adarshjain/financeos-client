import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { loadAccount, loadAccounts, loadBalanceSeries } from '@/lib/query/actions/accountActions';
import { loadBill, loadBills, markBillPaid, unmarkBillPaid, updateBillDetails } from '@/lib/query/actions/billActions';
import { loadCategories } from '@/lib/query/actions/categoryActions';
import { loadOutstandingCounterparties, searchCounterparties, suggestCounterparty } from '@/lib/query/actions/counterpartyActions';
import {
  loadBuiltins,
  loadDashboard,
  loadDashboards,
  restoreHomeDashboard,
  saveDashboard,
  saveDefaultDashboard,
} from '@/lib/query/actions/dashboardActions';
import { loadInbox, loadInboxSummary } from '@/lib/query/actions/inboxActions';
import { loadEmergencyFund } from '@/lib/query/actions/insightActions';
import { loadInstruments, loadPortfolioSummary, loadPositions, loadTaxHarvest } from '@/lib/query/actions/investmentActions';
import { loadActiveLoans } from '@/lib/query/actions/loanActions';
import {
  clearAllNotifications,
  clearNotification,
  loadNotificationFeed,
  loadNotificationSummary,
  markNotificationsRead,
  restoreNotification,
} from '@/lib/query/actions/notificationActions';
import { loadUpcomingObligations } from '@/lib/query/actions/obligationActions';
import { loadReportsList } from '@/lib/query/actions/reportActions';

beforeEach(() => vi.resetAllMocks());

const ok = <T>(data: T) => ({ success: true, data });

describe('bills', () => {
  it('lists bills, scoped to a card when given', async () => {
    api.GET.mockResolvedValue({ data: [{ accountId: 'a' }] });
    expect(await loadBills('a')).toEqual(ok([{ accountId: 'a' }]));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/bills', { params: { query: { accountId: 'a' } } });
    await loadBills(null);
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/bills', { params: { query: {} } });
  });
  it('reads one bill, null when missing', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect(await loadBill('s1')).toEqual(ok(null));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/bills/{statementId}', { params: { path: { statementId: 's1' } } });
  });
  it('marks paid, unmarks and updates details', async () => {
    api.POST.mockResolvedValue({ data: { id: 1 } });
    api.DELETE.mockResolvedValue({ data: { id: 2 } });
    api.PATCH.mockResolvedValue({ data: { id: 3 } });
    expect(await markBillPaid('s1', {})).toEqual(ok({ id: 1 }));
    expect(api.POST).toHaveBeenCalledWith('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId: 's1' } }, body: {} });
    expect(await unmarkBillPaid('s1')).toEqual(ok({ id: 2 }));
    expect(await updateBillDetails('s1', { dueDate: 'x' } as never)).toEqual(ok({ id: 3 }));
    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/bills/{statementId}/details', { params: { path: { statementId: 's1' } }, body: { dueDate: 'x' } });
  });
  it('reports a failure instead of throwing', async () => {
    api.POST.mockRejectedValue(new Error('down'));
    expect((await markBillPaid('s1', {})).success).toBe(false);
  });
});

describe('accounts', () => {
  it('reads the list, one account and the balance series', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect(await loadAccounts()).toEqual(ok([]));
    expect(await loadAccount('a1')).toEqual(ok(null));
    expect(await loadBalanceSeries('a1', 30)).toEqual(ok([]));
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/accounts/{id}/balance-series', { params: { path: { id: 'a1' }, query: { days: 30 } } });
  });
});

describe('dashboards', () => {
  it('reads list, one, and the catalog', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect(await loadDashboards()).toEqual(ok([]));
    expect(await loadDashboard('d1')).toEqual(ok(null));
    expect(await loadBuiltins()).toEqual(ok([]));
  });
  it('restores Home and saves a dashboard', async () => {
    api.POST.mockResolvedValue({ data: { id: 'h' } });
    api.PUT.mockResolvedValue({ data: { id: 'd1' } });
    expect(await restoreHomeDashboard()).toEqual(ok({ id: 'h' }));
    expect(await saveDashboard('d1', { name: 'n' } as never)).toEqual(ok({ id: 'd1' }));
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/dashboards/{id}', { params: { path: { id: 'd1' } }, body: { name: 'n' } });
  });
  describe('saveDefaultDashboard', () => {
    const current = { id: 'd1', name: 'Home', description: null, updatedAt: 't1', widgets: [] };
    it('PUTs the re-read dashboard with the new default flag', async () => {
      api.GET.mockResolvedValue({ data: current });
      api.PUT.mockResolvedValue({ data: { id: 'd1' } });
      expect(await saveDefaultDashboard('d1', true, 't1')).toEqual(ok({ data: { id: 'd1' } }));
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/dashboards/{id}', {
        params: { path: { id: 'd1' } },
        body: { name: 'Home', description: undefined, isDefault: true, widgets: [] },
      });
    });
    it('refuses when the dashboard is gone', async () => {
      api.GET.mockResolvedValue({ data: undefined });
      expect(await saveDefaultDashboard('d1', true, 't1')).toMatchObject({ success: false, error: { message: 'Dashboard not found' } });
    });
    it('refuses when it changed since the caller rendered it', async () => {
      api.GET.mockResolvedValue({ data: current });
      const result = await saveDefaultDashboard('d1', true, 'old');
      expect(result).toMatchObject({ success: false, error: { message: expect.stringContaining('changed since the page was loaded') } });
      expect(api.PUT).not.toHaveBeenCalled();
    });
  });
});

describe('small reads', () => {
  it('emergency fund, categories, reports, inbox', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect(await loadCategories()).toEqual(ok([]));
    expect(await loadReportsList()).toEqual(ok([]));
    api.GET.mockResolvedValue({ data: { x: 1 } });
    expect(await loadEmergencyFund()).toEqual(ok({ x: 1 }));
    expect(await loadInbox()).toEqual(ok({ x: 1 }));
    expect(await loadInboxSummary()).toEqual(ok({ x: 1 }));
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/inbox/summary');
  });
  it('active loans unwrap the page content', async () => {
    api.GET.mockResolvedValue({ data: { content: [{ id: 'l1' }] } });
    expect(await loadActiveLoans({ status: 'active', page: 0, size: 100 })).toEqual(ok([{ id: 'l1' }]));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/loans', { params: { query: { status: 'active', page: 0, size: 100 } } });
  });
  it('upcoming obligations join kinds', async () => {
    api.GET.mockResolvedValue({ data: { items: [{ t: 1 }] } });
    expect(await loadUpcomingObligations(6, ['emi', 'card_bill'])).toEqual(ok([{ t: 1 }]));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/obligations/upcoming', { params: { query: { months: 6, kinds: 'emi,card_bill' } } });
    await loadUpcomingObligations(1);
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/obligations/upcoming', { params: { query: { months: 1, kinds: undefined } } });
  });
});

describe('counterparties', () => {
  it('searches with and without a term, empty page when missing', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect(await searchCounterparties('', 20)).toMatchObject({ success: true, data: { content: [], size: 20, empty: true } });
    expect(api.GET).toHaveBeenCalledWith('/api/v1/counterparties', { params: { query: { page: 0, size: 20 } } });
    await searchCounterparties('ra', 20);
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/counterparties', { params: { query: { page: 0, size: 20, q: 'ra' } } });
  });
  it('suggests the best match or null', async () => {
    api.GET.mockResolvedValue({ data: { counterparty: { id: 'p1' } } });
    expect(await suggestCounterparty('rahul')).toEqual(ok({ id: 'p1' }));
    api.GET.mockResolvedValue({ data: {} });
    expect(await suggestCounterparty('x')).toEqual(ok(null));
  });
  it('lists outstanding balances sorted by net', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect(await loadOutstandingCounterparties(5)).toMatchObject({ success: true, data: { content: [], size: 5 } });
    expect(api.GET).toHaveBeenCalledWith('/api/v1/counterparties', { params: { query: { page: 0, size: 5, outstanding: true, sort: ['net'] } } });
  });
});

describe('notifications', () => {
  it('reads the feed and summary', async () => {
    api.GET.mockResolvedValue({ data: { unread: 1 } });
    expect(await loadNotificationFeed(2, 20)).toEqual(ok({ unread: 1 }));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/notifications/feed', { params: { query: { page: 2, size: 20 } } });
    expect(await loadNotificationSummary()).toEqual(ok({ unread: 1 }));
  });
  it('writes return nothing, clear-all returns the count', async () => {
    api.POST.mockResolvedValue({ data: { cleared: 4 } });
    expect(await markNotificationsRead('t')).toEqual(ok(undefined));
    expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/feed/read', { body: { before: 't' } });
    expect(await clearNotification('n1')).toEqual(ok(undefined));
    expect(await restoreNotification('n1')).toEqual(ok(undefined));
    expect(await clearAllNotifications()).toEqual(ok(4));
    api.POST.mockResolvedValue({ data: undefined });
    expect(await clearAllNotifications()).toEqual(ok(0));
  });
});

describe('investments', () => {
  it('reads positions, summary, harvest and an instrument page (empty when missing)', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect(await loadPositions()).toEqual(ok([]));
    expect(await loadInstruments({ page: 0, size: 50 })).toEqual(ok({ items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 }));
    api.GET.mockResolvedValue({ data: { positions: [{ id: 'p' }] } });
    expect(await loadPositions()).toEqual(ok([{ id: 'p' }]));
    api.GET.mockResolvedValue({ data: { v: 1 } });
    expect(await loadPortfolioSummary()).toEqual(ok({ v: 1 }));
    expect(await loadTaxHarvest({ fy: 2025, page: 1, size: 3 })).toEqual(ok({ v: 1 }));
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/investments/tax/harvest', { params: { query: { fy: 2025, page: 1, size: 3 } } });
  });
});
