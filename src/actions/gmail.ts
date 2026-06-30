'use server';

import { revalidatePath } from 'next/cache';

import { ApiError, gmailApi } from '@/lib/apiClient';
import type {
  ApiResult,
  ErrorResponse,
  GmailConnectionResponse,
  GmailOAuthStartResponse,
  GmailSenderRequest,
  GmailSenderResponse,
  SyncSummary,
} from '@/lib/types';

function handleError(error: unknown, defaultMessage: string): { success: false; error: ErrorResponse } {
  if (error instanceof ApiError) {
    return { success: false, error: error.response };
  }
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: defaultMessage,
      timestamp: new Date().toISOString(),
    },
  };
}

export async function startGmailOAuth(): Promise<
  ApiResult<GmailOAuthStartResponse>
> {
  try {
    const result = await gmailApi.startOAuth();
    return { success: true, data: result };
  } catch (error) {
    return handleError(error, 'Failed to start Gmail OAuth');
  }
}

export async function syncGmail(): Promise<ApiResult<SyncSummary>> {
  try {
    const result = await gmailApi.sync();
    revalidatePath('/transactions');
    revalidatePath('/settings');
    return { success: true, data: result };
  } catch (error) {
    return handleError(error, 'Failed to sync Gmail');
  }
}

export async function listGmailSenders(): Promise<ApiResult<GmailSenderResponse[]>> {
  try {
    const result = await gmailApi.listSenders();
    return { success: true, data: result };
  } catch (error) {
    return handleError(error, 'Failed to list Gmail senders');
  }
}

export async function createGmailSender(
  data: GmailSenderRequest
): Promise<ApiResult<GmailSenderResponse>> {
  try {
    const result = await gmailApi.createSender(data);
    revalidatePath('/settings');
    return { success: true, data: result };
  } catch (error) {
    return handleError(error, 'Failed to create Gmail sender');
  }
}

export async function updateGmailSender(
  id: string,
  data: GmailSenderRequest
): Promise<ApiResult<GmailSenderResponse>> {
  try {
    const result = await gmailApi.updateSender(id, data);
    revalidatePath('/settings');
    return { success: true, data: result };
  } catch (error) {
    return handleError(error, 'Failed to update Gmail sender');
  }
}

export async function deleteGmailSender(id: string): Promise<ApiResult<void>> {
  try {
    await gmailApi.deleteSender(id);
    revalidatePath('/settings');
    return { success: true, data: undefined as any };
  } catch (error) {
    return handleError(error, 'Failed to delete Gmail sender');
  }
}

export async function listGmailConnections(): Promise<ApiResult<GmailConnectionResponse[]>> {
  try {
    const result = await gmailApi.listConnections();
    return { success: true, data: result };
  } catch (error) {
    return handleError(error, 'Failed to list Gmail connections');
  }
}

export async function disconnectGmailConnection(id: string): Promise<ApiResult<void>> {
  try {
    await gmailApi.disconnectConnection(id);
    revalidatePath('/settings');
    return { success: true, data: undefined as any };
  } catch (error) {
    return handleError(error, 'Failed to disconnect Gmail connection');
  }
}
