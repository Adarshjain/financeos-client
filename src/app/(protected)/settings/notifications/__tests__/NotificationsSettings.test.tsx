import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import type { NotificationSettingsResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import { NotificationsSettings } from '../NotificationsSettings';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const pushMocks = vi.hoisted(() => ({
  isPushSupported: vi.fn(() => true),
  isIos: vi.fn(() => false),
  isStandaloneDisplay: vi.fn(() => true),
  notificationPermission: vi.fn(() => 'default' as 'default' | 'denied' | 'granted' | 'unsupported'),
  getCurrentPushSubscription: vi.fn(async () => null as PushSubscription | null),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(async () => null as string | null),
}));
vi.mock('@/lib/push', () => pushMocks);

function settings(overrides: Partial<NotificationSettingsResponse> = {}): NotificationSettingsResponse {
  return {
    pushEnabled: true,
    sendHour: 9,
    reminderOffsets: [7, 3, 1, 0],
    kinds: { STATEMENT_RECEIVED: true, BILL_DUE_REMINDER: true, BILL_OVERDUE: true },
    devices: [],
    mutedAccountIds: [],
    pushConfigured: true,
    ...overrides,
  } as NotificationSettingsResponse;
}

const cards = [
  { id: 'card-1', name: 'HDFC Regalia', type: AccountType.CREDIT_CARD },
  { id: 'card-2', name: 'Closed card', type: AccountType.CREDIT_CARD, closedOn: '2026-01-01' },
  { id: 'bank-1', name: 'HDFC Bank', type: AccountType.BANK_ACCOUNT },
];

let currentSettings: NotificationSettingsResponse = settings();

function render(initial = settings()) {
  currentSettings = initial;
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.settings.notifications(), initial);
  queryClient.setQueryData(keys.accounts.list(), cards);
  return renderWithQuery(<NotificationsSettings />, { queryClient });
}

describe('NotificationsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMocks.isPushSupported.mockReturnValue(true);
    pushMocks.getCurrentPushSubscription.mockResolvedValue(null);
    pushMocks.notificationPermission.mockReturnValue('default');
    // The test query client has staleTime 0, so the seeded accounts and settings are refetched on mount.
    vi.mocked(api.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/notifications/push/public-key') return { data: { publicKey: 'BKEY', configured: true } } as never;
      if (path === '/api/v1/accounts') return { data: cards } as never;
      return { data: currentSettings } as never;
    });
  });

  it('explains when the server has no VAPID keys', async () => {
    render(settings({ pushConfigured: false }));
    expect(await screen.findByText("Push isn't set up on the server")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enable on this device/i })).toBeNull();
  });

  it('explains when the browser cannot do push, with the iPhone install hint', async () => {
    pushMocks.isPushSupported.mockReturnValue(false);
    pushMocks.isIos.mockReturnValue(true);
    pushMocks.isStandaloneDisplay.mockReturnValue(false);
    render();
    expect(await screen.findByText("This browser can't receive push notifications")).toBeInTheDocument();
    expect(screen.getByText(/add FinanceOS to the Home Screen/i)).toBeInTheDocument();
  });

  it('enables push on this device and registers it with the server', async () => {
    pushMocks.subscribeToPush.mockImplementation(async () => {
      // Once subscribed, the browser holds the subscription the devices list recognises as "this device".
      pushMocks.getCurrentPushSubscription.mockResolvedValue({ endpoint: 'https://push/1' } as PushSubscription);
      return { endpoint: 'https://push/1', keys: { p256dh: 'k', auth: 'a' }, userAgent: 'Chrome · macOS' };
    });
    vi.mocked(api.POST).mockResolvedValue({
      data: settings({ devices: [{ endpoint: 'https://push/1', userAgent: 'Chrome · macOS', addedAt: '2026-10-08T05:00:00Z' }] }),
    } as never);
    render();

    const button = await screen.findByRole('button', { name: /enable on this device/i });
    fireEvent.click(button);

    await waitFor(() => expect(pushMocks.subscribeToPush).toHaveBeenCalledWith('BKEY'));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/push/subscriptions', {
        body: { endpoint: 'https://push/1', keys: { p256dh: 'k', auth: 'a' }, userAgent: 'Chrome · macOS' },
      }),
    );
    expect(await screen.findByText('Notifications are on for this device')).toBeInTheDocument();
    expect(screen.getByText('this device')).toBeInTheDocument();
  });

  it('turns push off on this device, dropping the browser and server copies', async () => {
    pushMocks.getCurrentPushSubscription.mockResolvedValue({ endpoint: 'https://push/1' } as PushSubscription);
    pushMocks.unsubscribeFromPush.mockResolvedValue('https://push/1');
    vi.mocked(api.POST).mockResolvedValue({ data: settings() } as never);
    render(settings({ devices: [{ endpoint: 'https://push/1', userAgent: 'Chrome · macOS', addedAt: null }] }));

    fireEvent.click(await screen.findByRole('button', { name: /turn off here/i }));

    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/push/subscriptions/remove', { body: { endpoint: 'https://push/1' } }),
    );
    expect(await screen.findByRole('button', { name: /enable on this device/i })).toBeInTheDocument();
  });

  it('saves preference changes immediately', async () => {
    vi.mocked(api.PUT).mockImplementation(async (_path: string, opts: unknown) => {
      const body = (opts as { body: Partial<NotificationSettingsResponse> }).body;
      return { data: settings({ ...body, kinds: { ...settings().kinds, ...(body.kinds ?? {}) } }) } as never;
    });
    render();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Overdue nags' }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/settings', { body: { kinds: { BILL_OVERDUE: false } } }),
    );

    const offsets = screen.getByTestId('reminder-offsets');
    fireEvent.click(within(offsets).getByRole('button', { name: '14 days before' }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/settings', { body: { reminderOffsets: [14, 7, 3, 1, 0] } }),
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Push notifications' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/settings', { body: { pushEnabled: false } }));
  });

  it('refuses to remove the last reminder offset', async () => {
    const { toast } = await import('sonner');
    render(settings({ reminderOffsets: [0] }));
    const offsets = await screen.findByTestId('reminder-offsets');
    fireEvent.click(within(offsets).getByRole('button', { name: 'On the day' }));
    expect(toast.error).toHaveBeenCalledWith('Keep at least one reminder');
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('lists only open credit cards and mutes one', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: settings({ mutedAccountIds: ['card-1'] }) } as never);
    render();
    const list = await screen.findByTestId('card-mutes');
    expect(within(list).getByText('HDFC Regalia')).toBeInTheDocument();
    expect(within(list).queryByText('Closed card')).toBeNull();
    expect(within(list).queryByText('HDFC Bank')).toBeNull();

    fireEvent.click(within(list).getByRole('checkbox', { name: 'Mute HDFC Regalia' }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/accounts/{accountId}/mute', {
        params: { path: { accountId: 'card-1' } },
        body: { muted: true },
      }),
    );
    expect(within(list).getByRole('checkbox', { name: 'Mute HDFC Regalia' })).toHaveAttribute('data-state', 'checked');
  });

  it('removes a registered device', async () => {
    vi.mocked(api.POST).mockResolvedValue({ data: settings() } as never);
    render(settings({ devices: [{ endpoint: 'https://push/other', userAgent: 'Safari · iOS', addedAt: '2026-10-01T00:00:00Z' }] }));
    const list = await screen.findByTestId('devices');
    expect(within(list).getByText('Safari · iOS')).toBeInTheDocument();
    fireEvent.click(within(list).getByRole('button', { name: 'Remove Safari · iOS' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/push/subscriptions/remove', { body: { endpoint: 'https://push/other' } }),
    );
    expect(pushMocks.unsubscribeFromPush).not.toHaveBeenCalled();
    expect(await screen.findByText('No device is registered yet.')).toBeInTheDocument();
  });
});

describe('NotificationsSettings loans and groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMocks.isPushSupported.mockReturnValue(true);
    pushMocks.getCurrentPushSubscription.mockResolvedValue(null);
    pushMocks.notificationPermission.mockReturnValue('default');
    vi.mocked(api.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/notifications/push/public-key') return { data: { publicKey: 'BKEY', configured: true } } as never;
      if (path === '/api/v1/accounts') return { data: cards } as never;
      if (path === '/api/v1/loans') {
        return { data: { content: [{ id: 'loan-1', name: 'Home loan' }, { id: 'loan-2', name: 'Car loan' }] } } as never;
      }
      return { data: currentSettings } as never;
    });
  });

  it('renders the switches grouped by module', async () => {
    render();
    expect(await screen.findByTestId('kind-group-Credit cards')).toBeInTheDocument();
    expect(within(screen.getByTestId('kind-group-Loans')).getByRole('checkbox', { name: 'EMI reminders' })).toBeInTheDocument();
    expect(within(screen.getByTestId('kind-group-Loans')).getByRole('checkbox', { name: 'EMI overdue' })).toBeInTheDocument();
    expect(within(screen.getByTestId('kind-group-Gmail')).getByRole('checkbox', { name: 'Mailbox disconnected' })).toBeInTheDocument();
    expect(within(screen.getByTestId('kind-group-Gmail')).getByRole('checkbox', { name: 'Emails needing attention' })).toBeInTheDocument();
    expect(screen.getByText('Remind me (bills and EMIs)')).toBeInTheDocument();
  });

  it('saves a new kind switch like the old ones', async () => {
    vi.mocked(api.PUT).mockImplementation(async (_path: string, opts: unknown) => {
      const body = (opts as { body: Partial<NotificationSettingsResponse> }).body;
      return { data: settings({ ...body, kinds: { ...settings().kinds, ...(body.kinds ?? {}) } }) } as never;
    });
    render();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'EMI overdue' }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/settings', { body: { kinds: { EMI_OVERDUE: false } } }),
    );
  });

  it('lists active loans and mutes one', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: settings({ mutedLoanIds: ['loan-1'] } as Partial<NotificationSettingsResponse>) } as never);
    render();
    const list = await screen.findByTestId('loan-mutes');
    expect(within(list).getByText('Home loan')).toBeInTheDocument();
    expect(within(list).getByText('Car loan')).toBeInTheDocument();

    fireEvent.click(within(list).getByRole('checkbox', { name: 'Mute Home loan' }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/loans/{loanId}/mute', {
        params: { path: { loanId: 'loan-1' } },
        body: { muted: true },
      }),
    );
    expect(within(list).getByRole('checkbox', { name: 'Mute Home loan' })).toHaveAttribute('data-state', 'checked');
    expect(within(list).getByRole('checkbox', { name: 'Mute Car loan' })).toHaveAttribute('data-state', 'unchecked');
  });

  it('says so when there are no active loans', async () => {
    vi.mocked(api.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/notifications/push/public-key') return { data: { publicKey: 'BKEY', configured: true } } as never;
      if (path === '/api/v1/accounts') return { data: cards } as never;
      if (path === '/api/v1/loans') return { data: { content: [] } } as never;
      return { data: currentSettings } as never;
    });
    render();
    expect(await screen.findByText('No active loans yet.')).toBeInTheDocument();
  });
});
