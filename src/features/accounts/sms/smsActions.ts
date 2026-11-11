'use server';

import { smsApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';
import type { SmsConfirmBody, SmsMessageStatus } from '@/lib/sms.types';

export const pauseDevice = action('sms.pauseDevice', createDomainAction(
  { fallbackError: "Couldn't pause the phone. Try again." },
  async (id: string): Promise<void> => smsApi.pauseDevice(id),
));

export const resumeDevice = action('sms.resumeDevice', createDomainAction(
  { fallbackError: "Couldn't resume the phone. Try again." },
  async (id: string): Promise<void> => smsApi.resumeDevice(id),
));

export const disconnectDevice = action('sms.disconnectDevice', createDomainAction(
  { fallbackError: "Couldn't disconnect the phone. Try again." },
  async (id: string): Promise<void> => smsApi.revokeDevice(id),
));

export const turnLineOn = action('sms.turnLineOn', createDomainAction(
  { fallbackError: "Couldn't turn this on. Try again." },
  async (id: string, accountId: string, syncFrom: string): Promise<void> => {
    await smsApi.lineOn(id, accountId, syncFrom || undefined);
  },
));

export const turnLineOff = action('sms.turnLineOff', createDomainAction(
  { fallbackError: "Couldn't turn this off. Try again." },
  async (id: string): Promise<void> => {
    await smsApi.lineOff(id);
  },
));

export const markLineNotMine = action('sms.markLineNotMine', createDomainAction(
  { fallbackError: "Couldn't hide this. Try again." },
  async (id: string): Promise<void> => {
    await smsApi.lineNotMine(id);
  },
));

export const markLinesNotMine = action('sms.markLinesNotMine', createDomainAction(
  { fallbackError: "Couldn't hide these. Try again." },
  async (ids: string[]): Promise<void> => smsApi.linesNotMine(ids),
));

export const undoLineNotMine = action('sms.undoLineNotMine', createDomainAction(
  { fallbackError: "Couldn't undo. Try again." },
  async (id: string): Promise<void> => {
    await smsApi.lineUndo(id);
  },
));

export const undoLinesNotMine = action('sms.undoLinesNotMine', createDomainAction(
  { fallbackError: "Couldn't undo. Try again." },
  async (ids: string[]): Promise<void> => smsApi.linesUndo(ids),
));

export const assignLine = action('sms.assignLine', createDomainAction(
  { fallbackError: "Couldn't save this. Try again." },
  async (id: string, accountId: string): Promise<void> => {
    await smsApi.lineAccount(id, accountId);
  },
));

/** Clears the "New" marks. Called once per page load; nothing is revalidated, so it never refetches the page. */
export const markLinesSeen = action('sms.markLinesSeen', createDomainAction(
  { fallbackError: "Couldn't update the page. Try again." },
  async (): Promise<void> => smsApi.linesSeen(),
));

export const loadSmsMessages = action('sms.loadMessages', createDomainAction(
  { fallbackError: "Couldn't load the messages. Try again." },
  async (status: SmsMessageStatus, page: number, size: number) => smsApi.messages(status, page, size),
));

export const confirmSmsMessage = action('sms.confirmMessage', createDomainAction(
  { fallbackError: "Couldn't confirm this message. Try again." },
  async (id: string, body: SmsConfirmBody) => smsApi.confirmMessage(id, body),
));

export const rejectSmsMessage = action('sms.rejectMessage', createDomainAction(
  { fallbackError: "Couldn't save this. Try again." },
  async (id: string) => smsApi.rejectMessage(id),
));
