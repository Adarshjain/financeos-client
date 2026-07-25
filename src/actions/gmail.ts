'use server';

import { revalidatePath } from 'next/cache';

import { gmailApi } from '@/lib/apiClient';
import { apiResult } from '@/lib/apiResult';
import type {
  ApiResult,
  GmailConnectionResponse,
  GmailOAuthStartResponse,
  GmailSenderRequest,
  GmailSenderResponse,
  SyncSummary,
} from '@/lib/types';

export async function startGmailOAuth(): Promise<
  ApiResult<GmailOAuthStartResponse>
> {
  return apiResult('Failed to start Gmail OAuth', () => gmailApi.startOAuth());
}

export async function syncGmail(): Promise<ApiResult<SyncSummary>> {
  return apiResult('Failed to sync Gmail', async () => {
    const result = await gmailApi.sync();
    revalidatePath('/transactions');
    revalidatePath('/settings');
    return result;
  });
}

export async function listGmailSenders(): Promise<ApiResult<GmailSenderResponse[]>> {
  return apiResult('Failed to list Gmail senders', () => gmailApi.listSenders());
}

export async function createGmailSender(
  data: GmailSenderRequest
): Promise<ApiResult<GmailSenderResponse>> {
  return apiResult('Failed to create Gmail sender', async () => {
    const result = await gmailApi.createSender(data);
    revalidatePath('/settings');
    return result;
  });
}

export async function updateGmailSender(
  id: string,
  data: GmailSenderRequest
): Promise<ApiResult<GmailSenderResponse>> {
  return apiResult('Failed to update Gmail sender', async () => {
    const result = await gmailApi.updateSender(id, data);
    revalidatePath('/settings');
    return result;
  });
}

export async function deleteGmailSender(id: string): Promise<ApiResult<void>> {
  return apiResult('Failed to delete Gmail sender', async () => {
    await gmailApi.deleteSender(id);
    revalidatePath('/settings');
  });
}

export async function listGmailConnections(): Promise<ApiResult<GmailConnectionResponse[]>> {
  return apiResult('Failed to list Gmail connections', () =>
    gmailApi.listConnections(),
  );
}

export async function disconnectGmailConnection(id: string): Promise<ApiResult<void>> {
  return apiResult('Failed to disconnect Gmail connection', async () => {
    await gmailApi.disconnectConnection(id);
    revalidatePath('/settings');
  });
}
