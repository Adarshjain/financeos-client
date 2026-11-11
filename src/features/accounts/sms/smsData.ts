import { type Loaded,loaded } from '@/features/shell/loadHelpers';
import type { Account } from '@/lib/account.types';
import { accountsApi, smsApi } from '@/lib/apiClient';
import type { SmsDevice, SmsLines, SmsMessagesPage, SmsReport } from '@/lib/sms.types';

export const MESSAGES_PAGE_SIZE = 25;

export interface SmsPageData {
  devices: Loaded<SmsDevice[]>;
  lines: Loaded<SmsLines>;
  /** Null when the report could not be read: the section is left out. */
  report: SmsReport | null;
  needsCheck: SmsMessagesPage | null;
  couldNotRead: SmsMessagesPage | null;
  accounts: Account[];
}

const orNull = <T,>(request: Promise<T>) => request.catch(() => null);

/** Every request of the page, started together and awaited together. */
export async function loadSmsPageData(): Promise<SmsPageData> {
  const [devices, lines, report, needsCheck, couldNotRead, accounts] = await Promise.all([
    loaded(smsApi.devices()),
    loaded(smsApi.lines()),
    orNull(smsApi.report()),
    orNull(smsApi.messages('NEEDS_CONFIRM', 0, MESSAGES_PAGE_SIZE)),
    orNull(smsApi.messages('COULD_NOT_READ', 0, MESSAGES_PAGE_SIZE)),
    orNull(accountsApi.list()),
  ]);
  return { devices, lines, report, needsCheck, couldNotRead, accounts: accounts ?? [] };
}
