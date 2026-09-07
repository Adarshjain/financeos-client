import { getFaro } from '@/instrumentation-client';
import { ApiError } from '@/lib/api/client';
import { refOf } from '@/lib/diagnostics/ref';

export interface DiagnosticRecord {
  at: string;
  ref: string;
  requestId?: string;
  errorId?: string;
  status: number;
  code: string;
  message: string;
  endpoint?: string;
  method?: string;
  route: string;
  source: 'api' | 'action' | 'boundary' | 'network';
  sessionId?: string;
  version?: string;
  reported?: boolean;
}

const STORAGE_KEY = 'financeos:diagnostics:errors';
const MAX_CAPACITY = 20;

interface PersistedState {
  ownerUserId: string | null;
  records: DiagnosticRecord[];
}

let memoryState: PersistedState = {
  ownerUserId: null,
  records: [],
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in diagnostics listener', e);
    }
  });
}

function loadFromStorage(): PersistedState {
  if (typeof window === 'undefined') {
    return { ownerUserId: null, records: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ownerUserId: null, records: [] };
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.records)) {
      return {
        ownerUserId: parsed.ownerUserId ?? null,
        records: parsed.records.slice(0, MAX_CAPACITY),
      };
    }
  } catch {
    // Corrupted storage fallback
  }
  return { ownerUserId: null, records: [] };
}

function saveToStorage(state: PersistedState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or private browsing
  }
}

// Initialise memory state on client
if (typeof window !== 'undefined') {
  memoryState = loadFromStorage();
}

export const errorLog = {
  setOwner(userId: string | null | undefined): void {
    const normalizedId = userId ? String(userId) : null;
    if (memoryState.ownerUserId !== normalizedId) {
      memoryState = {
        ownerUserId: normalizedId,
        records: [],
      };
      saveToStorage(memoryState);
      notify();
    }
  },

  getSnapshot(): DiagnosticRecord[] {
    return memoryState.records;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  clear(): void {
    memoryState = {
      ...memoryState,
      records: [],
    };
    saveToStorage(memoryState);
    notify();
  },

  record(
    input: unknown,
    context?: Partial<DiagnosticRecord> & { ref?: string; digest?: string },
  ): DiagnosticRecord {
    const at = new Date().toISOString();
    let status = context?.status ?? 500;
    let code = context?.code ?? 'UNKNOWN_ERROR';
    let message = 'An unexpected error occurred';
    let errorId: string | undefined = context?.errorId;
    let requestId: string | undefined = context?.requestId;
    let endpoint: string | undefined = context?.endpoint;
    let method: string | undefined = context?.method;
    let source: DiagnosticRecord['source'] = context?.source ?? 'api';
    let digest: string | undefined = context?.digest;

    if (input instanceof ApiError) {
      status = input.status;
      code = input.response.code || 'API_ERROR';
      message = input.response.message || input.message || 'API request failed';
      errorId = input.response.errorId || errorId;
      requestId = input.requestId || input.response.requestId || requestId;
      endpoint = input.endpoint || endpoint;
      method = input.method || method;
      source = input.status === 0 ? 'network' : (context?.source ?? 'api');
    } else if (input && typeof input === 'object') {
      const obj = input as Record<string, unknown>;
      if (typeof obj.code === 'string') code = obj.code;
      if (typeof obj.message === 'string') message = obj.message;
      if (typeof obj.errorId === 'string') errorId = obj.errorId;
      if (typeof obj.requestId === 'string') requestId = obj.requestId;
      if (typeof obj.digest === 'string') digest = obj.digest;
      if (typeof obj.status === 'number') status = obj.status;
    } else if (typeof input === 'string') {
      message = input;
    }

    if (context?.message) {
      message = context.message;
    }

    const ref = context?.ref || refOf({ errorId, requestId, digest }) || requestId || errorId || digest || 'unknown';

    let route = context?.route ?? '/';
    if (typeof window !== 'undefined' && window.location) {
      route = window.location.pathname;
    }

    let sessionId: string | undefined = context?.sessionId;
    try {
      const faro = getFaro();
      if (faro) {
        if (!sessionId) {
          sessionId = faro.api.getSession()?.id;
        }
        if (input instanceof Error) {
          faro.api.pushError(input, {
            context: {
              requestId: requestId || '',
              errorId: errorId || '',
              endpoint: endpoint || '',
              code,
            },
          });
        }
      }
    } catch {
      // Faro optional push failure
    }

    const record: DiagnosticRecord = {
      at,
      ref,
      requestId,
      errorId,
      status,
      code,
      message,
      endpoint,
      method,
      route,
      source,
      sessionId,
      version: context?.version,
      reported: false,
    };

    // If newest record has the same ref and code and is < 3s old, update in place
    const existingIndex = memoryState.records.findIndex((r) => {
      if (r.ref === ref && r.code === code && ref !== 'unknown') {
        const diffMs = Math.abs(new Date(at).getTime() - new Date(r.at).getTime());
        return diffMs < 3000;
      }
      return false;
    });

    let newRecords: DiagnosticRecord[];
    if (existingIndex >= 0) {
      const existing = memoryState.records[existingIndex];
      const merged: DiagnosticRecord = {
        ...existing,
        ...record,
        message: message.length >= existing.message.length ? message : existing.message,
        endpoint: endpoint || existing.endpoint,
        method: method || existing.method,
        requestId: requestId || existing.requestId,
        errorId: errorId || existing.errorId,
      };
      newRecords = [...memoryState.records];
      newRecords[existingIndex] = merged;
    } else {
      newRecords = [record, ...memoryState.records].slice(0, MAX_CAPACITY);
    }

    memoryState = {
      ...memoryState,
      records: newRecords,
    };

    saveToStorage(memoryState);
    notify();

    return record;
  },
};
