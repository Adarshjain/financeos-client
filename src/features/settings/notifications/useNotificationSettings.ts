'use client';

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type {
  NotificationSettingsResponse,
  PushSubscriptionRequest,
  UpdateNotificationSettingsRequest,
} from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

import {
  loadNotificationSettings,
  loadPushPublicKey,
  muteAccount,
  muteLoanNotifications,
  removePushDevice,
  sendTestNotification,
  subscribePush,
  unsubscribePush,
  updateNotificationSettings,
} from './notificationActions';

export function useNotificationSettings(initialData?: NotificationSettingsResponse) {
  return useQuery({
    queryKey: keys.settings.notifications(),
    queryFn: () => unwrapAction(loadNotificationSettings()),
    initialData,
  });
}

export function usePushPublicKey(enabled = true) {
  return useQuery({
    queryKey: keys.settings.pushPublicKey(),
    queryFn: () => unwrapAction(loadPushPublicKey()),
    enabled,
    staleTime: 60 * 60 * 1000,
  });
}

const WRITE_KEY = ['settings', 'notifications', 'write'] as const;

type Cached = NotificationSettingsResponse | null | undefined;
type Settings = NotificationSettingsResponse;

/** What the server last confirmed for one switch, and how many toggles of it are in flight. Shared by every card. */
interface Tracked {
  inFlight: number;
  confirmed: boolean | undefined;
}
const tracked = new WeakMap<QueryClient, Map<string, Tracked>>();

type Switch =
  | { type: 'kind'; id: string }
  | { type: 'account'; id: string }
  | { type: 'loan'; id: string };
const switchKey = (w: Switch) => `${w.type}:${w.id}`;

function readSwitch(s: Settings, w: Switch): boolean | undefined {
  if (w.type === 'kind') return s.kinds?.[w.id];
  return (w.type === 'account' ? s.mutedAccountIds : s.mutedLoanIds)?.includes(w.id) ?? false;
}

function writeSwitch(s: Settings, w: Switch, value: boolean | undefined): Settings {
  if (w.type === 'kind') {
    const kinds = { ...s.kinds };
    if (value === undefined) delete kinds[w.id];
    else kinds[w.id] = value;
    return { ...s, kinds };
  }
  const field = w.type === 'account' ? 'mutedAccountIds' : 'mutedLoanIds';
  const rest = (s[field] ?? []).filter((x) => x !== w.id);
  return { ...s, [field]: value ? [...rest, w.id] : rest };
}

/**
 * Kind and mute switches move at once and save behind it. Each switch remembers what the server last
 * confirmed, so a failure puts it back to that (not to a neighbouring toggle's optimistic state), and an
 * answer only touches its own switch (never replaces the whole view, which could carry another toggle's
 * stale value).
 */
export function useNotificationSettingsMutations() {
  const qc = useQueryClient();
  const key = keys.settings.notifications();
  const book = () => {
    let m = tracked.get(qc);
    if (!m) tracked.set(qc, (m = new Map()));
    return m;
  };
  const cached = () => qc.getQueryData<Cached>(key);
  const setCached = (change: (s: Settings) => Settings) => {
    const now = cached();
    if (now) qc.setQueryData<Cached>(key, change(now));
  };

  /** Shows the switches at their new positions; the "before" is read once the cache is settled. */
  const begin = async (changes: { w: Switch; value: boolean | undefined }[]) => {
    await qc.cancelQueries({ queryKey: key });
    const now = cached();
    if (!now) return;
    for (const { w } of changes) {
      const entry = book().get(switchKey(w)) ?? { inFlight: 0, confirmed: readSwitch(now, w) };
      if (entry.inFlight === 0) entry.confirmed = readSwitch(now, w);
      entry.inFlight += 1;
      book().set(switchKey(w), entry);
    }
    setCached((s) => changes.reduce((acc, { w, value }) => writeSwitch(acc, w, value), s));
  };
  /** One toggle answered: remember what the server holds and, once none is left in flight, show it. */
  const finish = (w: Switch, server: boolean | undefined | 'failed') => {
    const entry = book().get(switchKey(w));
    if (!entry) return;
    entry.inFlight = Math.max(0, entry.inFlight - 1);
    if (server !== 'failed') entry.confirmed = server;
    if (entry.inFlight === 0) setCached((s) => writeSwitch(s, w, entry.confirmed));
  };
  /** A write that is not a switch: its own fields go into the cache, nothing else. */
  const mergeFields = (server: Settings, fields: (keyof Settings)[]) =>
    setCached((s) => ({ ...s, ...Object.fromEntries(fields.map((f) => [f, server[f]])) }));

  const kindSwitches = (body: UpdateNotificationSettingsRequest) =>
    Object.entries(body.kinds ?? {}).map(([id, value]) => ({
      w: { type: 'kind', id } as Switch,
      value: value === null ? undefined : value,
    }));

  const update = useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: (body: UpdateNotificationSettingsRequest) => unwrapAction(updateNotificationSettings(body)),
    onMutate: (body) => begin(kindSwitches(body)),
    onSuccess: (server, body) => {
      for (const { w } of kindSwitches(body)) finish(w, readSwitch(server, w));
      const { kinds: _kinds, ...fields } = body;
      mergeFields(server, Object.keys(fields) as (keyof Settings)[]);
    },
    onError: (_e, body) => {
      for (const { w } of kindSwitches(body)) finish(w, 'failed');
    },
  });

  const subscribe = useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: (body: PushSubscriptionRequest) => unwrapAction(subscribePush(body)),
    onSuccess: (server) => mergeFields(server, ['devices', 'pushEnabled']),
  });

  const unsubscribe = useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: (endpoint: string) => unwrapAction(unsubscribePush(endpoint)),
    onSuccess: (server) => mergeFields(server, ['devices', 'pushEnabled']),
  });

  const removeDevice = useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: (endpoint: string) => unwrapAction(removePushDevice(endpoint)),
    onSuccess: (server) => mergeFields(server, ['devices', 'pushEnabled']),
  });

  const mute = useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: ({ accountId, muted }: { accountId: string; muted: boolean }) =>
      unwrapAction(muteAccount(accountId, muted)),
    onMutate: ({ accountId, muted }) => begin([{ w: { type: 'account', id: accountId }, value: muted }]),
    onSuccess: (server, { accountId }) => {
      const w: Switch = { type: 'account', id: accountId };
      finish(w, readSwitch(server, w));
      // Bills carry the muted flag too.
      void qc.invalidateQueries({ queryKey: keys.bills.all });
    },
    onError: (_e, { accountId }) => finish({ type: 'account', id: accountId }, 'failed'),
  });

  const muteLoan = useMutation({
    mutationKey: WRITE_KEY,
    mutationFn: ({ loanId, muted }: { loanId: string; muted: boolean }) =>
      unwrapAction(muteLoanNotifications(loanId, muted)),
    onMutate: ({ loanId, muted }) => begin([{ w: { type: 'loan', id: loanId }, value: muted }]),
    onSuccess: (server, { loanId }) => {
      const w: Switch = { type: 'loan', id: loanId };
      finish(w, readSwitch(server, w));
      // Loan responses carry the muted flag too.
      void qc.invalidateQueries({ queryKey: keys.loans.all });
    },
    onError: (_e, { loanId }) => finish({ type: 'loan', id: loanId }, 'failed'),
  });

  const sendTest = useMutation({
    mutationFn: () => unwrapAction(sendTestNotification()),
  });

  return { update, subscribe, unsubscribe, removeDevice, mute, muteLoan, sendTest };
}
