import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import type { NotificationSettingsResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';
import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import { ALL_KIND_KEYS, BILLS_KINDS, KIND_GROUPS } from './notificationKinds';
import { KIND_OPTIONS } from './notificationSettings.helpers';
import { NotificationsSettings } from './NotificationsSettings';

const routerRefresh = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: routerRefresh }),
}));

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
  describeDevice: vi.fn(() => 'Chrome · macOS'),
}));
vi.mock('./push', () => pushMocks);

function settings(overrides: Partial<NotificationSettingsResponse> = {}): NotificationSettingsResponse {
  return {
    pushEnabled: true,
    sendHour: 9,
    reminderOffsets: [7, 3, 1, 0],
    kinds: { STATEMENT_RECEIVED: true, BILL_DUE_REMINDER: true, BILL_OVERDUE: true },
    devices: [],
    mutedAccountIds: [],
    mutedLoanIds: [],
    pushConfigured: true,
    ...overrides,
  } as NotificationSettingsResponse;
}

const cards = [
  { id: 'card-1', name: 'HDFC Regalia', type: AccountType.CREDIT_CARD },
  { id: 'card-2', name: 'Closed card', type: AccountType.CREDIT_CARD, closedOn: '2026-01-01' },
  { id: 'bank-1', name: 'HDFC Bank', type: AccountType.BANK_ACCOUNT },
];
const loans = [
  { id: 'loan-1', name: 'Home loan' },
  { id: 'loan-2', name: 'Car loan' },
];

let currentSettings: NotificationSettingsResponse = settings();
let currentLoans: unknown[] = loans;

function render(initial = settings()) {
  currentSettings = initial;
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(keys.settings.notifications(), initial);
  queryClient.setQueryData(keys.accounts.list(), cards);
  return renderWithQuery(<NotificationsSettings />, { queryClient });
}

function echoPut() {
  vi.mocked(api.PUT).mockImplementation(async (_path: string, opts: unknown) => {
    const body = (opts as { body: Partial<NotificationSettingsResponse> }).body;
    return { data: settings({ ...body, kinds: { ...settings().kinds, ...(body.kinds ?? {}) } }) } as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentLoans = loans;
  pushMocks.isPushSupported.mockReturnValue(true);
  pushMocks.isIos.mockReturnValue(false);
  pushMocks.getCurrentPushSubscription.mockResolvedValue(null);
  pushMocks.notificationPermission.mockReturnValue('default');
  vi.mocked(api.GET).mockImplementation(async (path: string) => {
    if (path === '/api/v1/notifications/push/public-key') return { data: { publicKey: 'BKEY', configured: true } } as never;
    if (path === '/api/v1/accounts') return { data: cards } as never;
    if (path === '/api/v1/loans') return { data: { content: currentLoans } } as never;
    return { data: currentSettings } as never;
  });
});

describe('Notifications tab: warnings', () => {
  it('explains when the server has no VAPID keys', async () => {
    render(settings({ pushConfigured: false }));
    expect(await screen.findByText("Push isn't set up on the server")).toBeInTheDocument();
    expect(screen.getByText(/PUSH_VAPID_PUBLIC_KEY/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Turn on here' })).toBeNull();
  });

  it('explains when the browser cannot do push, with the iPhone install hint', async () => {
    pushMocks.isPushSupported.mockReturnValue(false);
    pushMocks.isIos.mockReturnValue(true);
    pushMocks.isStandaloneDisplay.mockReturnValue(false);
    render();
    expect(await screen.findByText("This browser can't receive push notifications")).toBeInTheDocument();
    expect(screen.getByText(/add FinanceOS to the Home Screen/i)).toBeInTheDocument();
  });

  it('asks an iPhone browser to install to the Home Screen first', async () => {
    pushMocks.isIos.mockReturnValue(true);
    pushMocks.isStandaloneDisplay.mockReturnValue(false);
    render();
    expect(await screen.findByText('Add FinanceOS to the Home Screen')).toBeInTheDocument();
  });

  it('says so when notifications are blocked, and disables Turn on here', async () => {
    pushMocks.notificationPermission.mockReturnValue('denied');
    render();
    expect(await screen.findByText('Notifications are blocked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn on here' })).toBeDisabled();
  });

  it('does not hang on Checking when notifications are blocked or unsupported', async () => {
    pushMocks.getCurrentPushSubscription.mockImplementation(() => new Promise(() => {}));
    pushMocks.notificationPermission.mockReturnValue('denied');
    const first = render();
    expect(await screen.findByText('Not receiving notifications')).toBeInTheDocument();
    expect(screen.queryByText('Checking…')).toBeNull();
    first.unmount();

    pushMocks.notificationPermission.mockReturnValue('default');
    pushMocks.isPushSupported.mockReturnValue(false);
    render();
    expect(await screen.findByText('Not receiving notifications')).toBeInTheDocument();
  });
});

describe('Notifications tab: this browser and devices', () => {
  it('names this browser and turns notifications on', async () => {
    pushMocks.subscribeToPush.mockImplementation(async () => {
      pushMocks.getCurrentPushSubscription.mockResolvedValue({ endpoint: 'https://push/1' } as PushSubscription);
      return { endpoint: 'https://push/1', keys: { p256dh: 'k', auth: 'a' }, userAgent: 'Chrome · macOS' };
    });
    vi.mocked(api.POST).mockResolvedValue({
      data: settings({ devices: [{ endpoint: 'https://push/1', userAgent: 'Chrome · macOS', addedAt: '2026-09-02T05:00:00Z' }] }),
    } as never);
    render();

    expect(await screen.findByText(/^This browser · /)).toBeInTheDocument();
    expect(await screen.findByText('Not receiving notifications')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Turn on here' }));

    await waitFor(() => expect(pushMocks.subscribeToPush).toHaveBeenCalledWith('BKEY'));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/push/subscriptions', {
        body: { endpoint: 'https://push/1', keys: { p256dh: 'k', auth: 'a' }, userAgent: 'Chrome · macOS' },
      }),
    );
    expect(await screen.findByText('added 2 Sep · notifications are on here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn off here' })).toBeInTheDocument();
  });

  it('shows the blocked banner and disables Turn on here after the prompt is denied', async () => {
    pushMocks.subscribeToPush.mockImplementation(async () => {
      pushMocks.notificationPermission.mockReturnValue('denied');
      throw new Error('Permission denied');
    });
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'Turn on here' }));
    expect(await screen.findByText('Notifications are blocked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn on here' })).toBeDisabled();
  });

  it('turns notifications off here, dropping the browser and server copies', async () => {
    pushMocks.getCurrentPushSubscription.mockResolvedValue({ endpoint: 'https://push/1' } as PushSubscription);
    pushMocks.unsubscribeFromPush.mockResolvedValue('https://push/1');
    vi.mocked(api.POST).mockResolvedValue({ data: settings() } as never);
    render(settings({ devices: [{ endpoint: 'https://push/1', userAgent: 'Chrome · macOS', addedAt: null }] }));

    fireEvent.click(await screen.findByRole('button', { name: 'Turn off here' }));

    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/push/subscriptions/remove', { body: { endpoint: 'https://push/1' } }),
    );
    expect(await screen.findByRole('button', { name: 'Turn on here' })).toBeInTheDocument();
  });

  it('removes another device without a confirm, and leaves this browser subscribed', async () => {
    const { toast } = await import('sonner');
    vi.mocked(api.POST).mockResolvedValue({ data: settings() } as never);
    render(settings({ devices: [{ endpoint: 'https://push/other', userAgent: 'Safari · iOS', addedAt: '2026-09-14T00:00:00Z' }] }));
    expect(await screen.findByText('Safari · iOS')).toBeInTheDocument();
    expect(screen.getByText('added 14 Sep')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/push/subscriptions/remove', { body: { endpoint: 'https://push/other' } }),
    );
    expect(toast.success).toHaveBeenCalledWith('Device removed');
    expect(pushMocks.unsubscribeFromPush).not.toHaveBeenCalled();
    expect(await screen.findByText('No devices yet')).toBeInTheDocument();
  });

  it('shows Send a test only when this browser is registered, and sends it', async () => {
    const { toast } = await import('sonner');
    vi.mocked(api.POST).mockResolvedValue({ data: { sent: 2 } } as never);
    const first = render();
    expect(await screen.findByText('Not receiving notifications')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send a test' })).toBeNull();
    first.unmount();

    // Another device exists but this browser is not registered: still no test button.
    const second = render(settings({ devices: [{ endpoint: 'https://push/other', userAgent: 'Safari · iOS', addedAt: null }] }));
    expect(await screen.findByText('Not receiving notifications')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send a test' })).toBeNull();
    second.unmount();

    pushMocks.getCurrentPushSubscription.mockResolvedValue({ endpoint: 'https://push/1' } as PushSubscription);
    render(settings({ devices: [{ endpoint: 'https://push/1', userAgent: 'Chrome · macOS', addedAt: null }] }));
    fireEvent.click(await screen.findByRole('button', { name: 'Send a test' }));
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/api/v1/notifications/push/test'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Test sent to 2 devices'));
  });
});

describe('Notifications tab: bills and EMIs', () => {
  it('shows stored offsets, including extra ones', async () => {
    render(settings({ reminderOffsets: [10, 0] }));
    fireEvent.click(await screen.findByRole('button', { name: 'Days before due' }));
    expect(await screen.findByRole('option', { name: /10 days before/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /14 days before/ })).toBeInTheDocument();
  });

  it('saves a changed day immediately', async () => {
    echoPut();
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'Days before due' }));
    fireEvent.click(await screen.findByRole('option', { name: /14 days before/ }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/settings', { body: { reminderOffsets: [14, 7, 3, 1, 0] } }),
    );
  });

  it('refuses to remove the last reminder', async () => {
    const { toast } = await import('sonner');
    render(settings({ reminderOffsets: [0] }));
    fireEvent.click(await screen.findByRole('button', { name: 'Days before due' }));
    fireEvent.click(await screen.findByRole('option', { name: /On the day/ }));
    expect(toast.error).toHaveBeenCalledWith('Keep at least one reminder');
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('saves the send hour', async () => {
    echoPut();
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'Send at' }));
    fireEvent.click(await screen.findByRole('option', { name: '6:00 pm' }));
    await waitFor(() => expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/settings', { body: { sendHour: 18 } }));
  });
});

describe('Notifications tab: kinds and grouping', () => {
  it('saves the master switch', async () => {
    echoPut();
    render();
    fireEvent.click(await screen.findByLabelText('Push notifications'));
    await waitFor(() => expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/settings', { body: { pushEnabled: false } }));
  });

  it('has exactly one switch row for every kind, absent kinds on', async () => {
    render();
    await screen.findByLabelText('Push notifications');
    expect(ALL_KIND_KEYS.sort()).toEqual(KIND_OPTIONS.map((k) => k.key).sort());
    for (const kind of [...BILLS_KINDS, ...KIND_GROUPS.flatMap((g) => g.kinds)]) {
      expect(screen.getAllByLabelText(kind.label)).toHaveLength(1);
    }
    expect(screen.getByLabelText('Emails needing attention')).toHaveAttribute('aria-checked', 'true');
  });

  /** The card root: title -> title block -> header -> card. */
  const cardOf = (title: string) => screen.getByText(title).parentElement!.parentElement!.parentElement!;

  it('groups each kind under its card title, with the master switch in Push', async () => {
    render();
    await screen.findByLabelText('Push notifications');
    const groups: Record<string, string[]> = {
      'Bills & EMIs': ['Bill due', 'Bill overdue', 'EMI due', 'EMI overdue', 'Money due back'],
      Statements: ['Statement arrived', 'Statement missing', 'Unreviewed after a statement'],
      'Gmail & jobs': ['Mailbox needs reconnecting', 'Emails needing attention', 'Jobs finished or failed'],
      Rewards: ['Milestone close or reached', 'Cap reached'],
    };
    for (const [title, labels] of Object.entries(groups)) {
      const card = cardOf(title);
      for (const label of labels) expect(within(card).getByLabelText(label)).toBeInTheDocument();
    }
    const push = cardOf('Push');
    expect(within(push).getByLabelText('Push notifications')).toBeInTheDocument();
    expect(within(push).getByText('Pushes only. The bell always shows everything.')).toBeInTheDocument();
    const bills = cardOf('Bills & EMIs');
    expect(within(bills).getByRole('button', { name: 'Days before due' })).toBeInTheDocument();
    expect(within(bills).getByRole('button', { name: 'Send at' })).toBeInTheDocument();
    expect(screen.queryByText('What to tell me about')).not.toBeInTheDocument();
  });

  it('shows a kind switched off as off', async () => {
    render(settings({ kinds: { STATEMENT_REVIEW_DIGEST: false } }));
    expect(await screen.findByLabelText('Unreviewed after a statement')).toHaveAttribute('aria-checked', 'false');
  });

  it('saves a kind switch', async () => {
    echoPut();
    render();
    fireEvent.click(await screen.findByLabelText('EMI overdue'));
    await waitFor(() => expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/settings', { body: { kinds: { EMI_OVERDUE: false } } }));
  });
});

describe('Notifications tab: instant switches', () => {
  it('flips a kind switch before the save answers, and flips it back with a toast when it fails', async () => {
    let fail!: (e: unknown) => void;
    vi.mocked(api.PUT).mockReturnValue(new Promise((_res, rej) => (fail = rej)) as never);
    const { toast } = await import('sonner');
    render();
    const sw = await screen.findByLabelText('EMI overdue');
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    await waitFor(() => expect(screen.getByLabelText('EMI overdue')).toHaveAttribute('aria-checked', 'false'));
    expect(toast.error).not.toHaveBeenCalled();
    fail(new Error('boom'));
    await waitFor(() => expect(screen.getByLabelText('EMI overdue')).toHaveAttribute('aria-checked', 'true'));
    expect(toast.error).toHaveBeenCalled();
  });

  it('flips a mute switch before the save answers', async () => {
    vi.mocked(api.PUT).mockReturnValue(new Promise(() => {}) as never);
    render();
    fireEvent.click(await screen.findByRole('switch', { name: 'Mute HDFC Regalia' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Mute HDFC Regalia' })).toHaveAttribute('aria-checked', 'true'));
  });
});

describe('Notifications tab: muted', () => {
  it('lists only open credit cards and mutes one', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: settings({ mutedAccountIds: ['card-1'] }) } as never);
    render();
    expect(await screen.findByText('HDFC Regalia')).toBeInTheDocument();
    expect(screen.queryByText('Closed card')).toBeNull();
    expect(screen.queryByText('HDFC Bank')).toBeNull();

    fireEvent.click(screen.getByRole('switch', { name: 'Mute HDFC Regalia' }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/accounts/{accountId}/mute', {
        params: { path: { accountId: 'card-1' } },
        body: { muted: true },
      }),
    );
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Mute HDFC Regalia' })).toHaveAttribute('aria-checked', 'true'));
  });

  it('lists active loans and mutes one', async () => {
    vi.mocked(api.PUT).mockResolvedValue({ data: settings({ mutedLoanIds: ['loan-1'] }) } as never);
    render();
    expect(await screen.findByText('Home loan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Mute Home loan' }));
    await waitFor(() =>
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/notifications/loans/{loanId}/mute', {
        params: { path: { loanId: 'loan-1' } },
        body: { muted: true },
      }),
    );
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Mute Home loan' })).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByRole('switch', { name: 'Mute Car loan' })).toHaveAttribute('aria-checked', 'false');
  });

  it('says so when there are no open cards or active loans', async () => {
    currentLoans = [];
    vi.mocked(api.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/accounts') return { data: [] } as never;
      if (path === '/api/v1/loans') return { data: { content: [] } } as never;
      if (path === '/api/v1/notifications/push/public-key') return { data: { publicKey: 'BKEY', configured: true } } as never;
      return { data: currentSettings } as never;
    });
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(keys.settings.notifications(), settings());
    queryClient.setQueryData(keys.accounts.list(), []);
    currentSettings = settings();
    renderWithQuery(<NotificationsSettings />, { queryClient });
    const muted = await screen.findByText('Per card or loan');
    expect(muted).toBeInTheDocument();
    expect(await screen.findByText('No open credit cards yet')).toBeInTheDocument();
    expect(await screen.findByText('No active loans yet')).toBeInTheDocument();
    expect(within(document.body).queryByText('Home loan')).toBeNull();
  });
});

describe('Notifications tab: loading and failure', () => {
  it('shows skeletons while settings load', () => {
    vi.mocked(api.GET).mockImplementation(() => new Promise(() => {}) as never);
    renderWithQuery(<NotificationsSettings />);
    expect(screen.getByTestId('notifications-skeleton')).toBeInTheDocument();
  });

  it('says so when settings could not load', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: undefined } as never);
    renderWithQuery(<NotificationsSettings />);
    expect(await screen.findByText("Couldn't load notification settings")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
