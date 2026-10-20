import { describe, expect, it } from 'vitest';

import type { DiagnosticRecord } from '@/lib/diagnostics/errorLog';

import { asRefType, failureLine, formatClock, formatWhen, formatWhenFull, requestUser, statusTone, timelineDepth } from './debugModel';

const at = '2026-10-13T08:08:49.101Z'; // 13:38:49 IST

describe('debugModel', () => {
  it('formats times in the app zone', () => {
    expect(formatWhen(at)).toBe('13 Oct 13:38');
    expect(formatWhenFull(at)).toBe('13 Oct 13:38:49 IST');
    expect(formatClock(at)).toBe('13:38:49.101');
    expect(formatWhen('nope')).toBe('');
  });

  it('maps status to a badge tone', () => {
    expect(statusTone(500)).toBe('danger');
    expect(statusTone(400)).toBe('danger');
    expect(statusTone(302)).toBe('info');
    expect(statusTone(200)).toBe('success');
  });

  it('names the user: email, short id, or Anonymous', () => {
    const base = { method: 'GET', route: '/', status: 200, durationMs: 1, at, slow: false };
    expect(requestUser({ ...base, userEmail: 'a@b.test' })).toBe('a@b.test');
    expect(requestUser({ ...base, userId: '12345678-aaaa' })).toBe('User: 12345678…');
    expect(requestUser(base)).toBe('Anonymous');
  });

  it('indents timeline lines: request-level 0, errors 2, others 1', () => {
    const e = { at, level: 'INFO', message: 'm', source: 'server', fields: {} };
    expect(timelineDepth({ ...e, event: 'http' })).toBe(0);
    expect(timelineDepth({ ...e, event: 'access' })).toBe(0);
    expect(timelineDepth(e)).toBe(1);
    expect(timelineDepth({ ...e, level: 'error' })).toBe(2);
  });

  it('narrows the type param', () => {
    expect(asRefType('errorId')).toBe('errorId');
    expect(asRefType('requestId')).toBe('requestId');
    expect(asRefType('x')).toBe('auto');
    expect(asRefType(undefined)).toBe('auto');
  });

  it('builds the failure line with method, route, status and time', () => {
    const rec = { at, ref: 'R', status: 400, code: 'C', message: 'm', route: '/r', endpoint: '/api/v1/reports', method: 'POST', source: 'api' } as DiagnosticRecord;
    expect(failureLine(rec)).toBe('POST /api/v1/reports · 400 · 13 Oct 13:38');
    expect(failureLine({ ...rec, status: 0, method: undefined, endpoint: undefined })).toBe('GET /r · Network · 13 Oct 13:38');
  });
});
