import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getRequestBodyInfo,
  getRequiredQueryParams,
  loadOperations,
  pathParams,
} from '../coverage/spec';
import { E2E_API_URL } from '../fixtures/config';
import { expect, test } from '../fixtures/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SweepAllowlistEntry {
  method: string;
  path: string;
  reason: string;
}

function loadSweepAllowlist(): SweepAllowlistEntry[] {
  const p = path.resolve(__dirname, '../coverage/sweep-allowlist.json');
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

const sweepAllowlist = loadSweepAllowlist();
const allowlistMap = new Map(
  sweepAllowlist.map((entry) => [`${entry.method.toUpperCase()} ${entry.path}`, entry.reason])
);

function isPublic(method: string, p: string): boolean {
  // Spring Security handles /logout via LogoutFilter which permits all and returns 200
  if (
    method === 'POST' &&
    (p === '/api/v1/auth/login' || p === '/api/v1/auth/signup' || p === '/api/v1/auth/logout')
  ) {
    return true;
  }
  if (method === 'GET' && p.startsWith('/api/v1/auth/google/')) {
    return true;
  }
  return false;
}

function substitutePath(p: string): string {
  const params = pathParams(p);
  let resolved = p;
  for (const param of params) {
    const replacement = param.format === 'uuid' ? crypto.randomUUID() : 'does-not-exist';
    resolved = resolved.replace(`{${param.name}}`, encodeURIComponent(replacement));
  }
  return resolved;
}

const allOps = loadOperations();

test.describe('@sweep 401 Negative Sweep', () => {
  for (const op of allOps) {
    if (isPublic(op.method, op.path)) {
      continue;
    }

    const key = `${op.method} ${op.path}`;
    const allowlistedReason = allowlistMap.get(key);

    test(`401 on ${op.method} ${op.path}`, async () => {
      if (allowlistedReason) {
        test.skip(true, `Allowlisted: ${allowlistedReason}`);
      }

      const resolvedPath = substitutePath(op.path);
      const url = `${E2E_API_URL}${resolvedPath}`;
      const bodyInfo = getRequestBodyInfo(op.method, op.path);

      let body: string | FormData | undefined = undefined;
      const headers: Record<string, string> = {};

      if (bodyInfo.hasBody) {
        if (bodyInfo.isMultipart) {
          body = new FormData();
        } else {
          headers['Content-Type'] = 'application/json';
          body = '{}';
        }
      }

      const res = await fetch(url, {
        method: op.method,
        headers,
        body,
      });

      expect(res.status, `Expected 401 for ${op.method} ${resolvedPath}`).toBe(401);
    });
  }
});

test.describe('@sweep Unknown ID Negative Sweep', () => {
  for (const op of allOps) {
    const params = pathParams(op.path);
    if (params.length === 0) {
      continue;
    }

    const key = `${op.method} ${op.path}`;
    const allowlistedReason = allowlistMap.get(key);

    test(`unknown-id on ${op.method} ${op.path}`, async ({ user }, testInfo) => {
      if (allowlistedReason) {
        test.skip(true, `Allowlisted: ${allowlistedReason}`);
      }

      const resolvedPath = substitutePath(op.path);
      const reqQuery = getRequiredQueryParams(op.method, op.path);
      const queryString = new URLSearchParams(reqQuery).toString();
      const url = `${E2E_API_URL}${resolvedPath}${queryString ? '?' + queryString : ''}`;
      const bodyInfo = getRequestBodyInfo(op.method, op.path);

      let body: string | FormData | undefined = undefined;
      const headers: Record<string, string> = {
        Cookie: `FINANCEOS_SESSION=${user.cookie}`,
      };

      if (bodyInfo.hasBody) {
        if (bodyInfo.isMultipart) {
          const fd = new FormData();
          fd.append('files', new Blob(['dummy content']), 'dummy.txt');
          body = fd;
        } else {
          headers['Content-Type'] = 'application/json';
          body = '{}';
        }
      }

      const res = await fetch(url, {
        method: op.method,
        headers,
        body,
      });

      testInfo.annotations.push({
        type: 'status',
        description: String(res.status),
      });

      expect(
        res.status,
        `Expected non-2xx and non-5xx (4xx) on unknown id for ${op.method} ${resolvedPath}, but got ${res.status}`
      ).toBeGreaterThanOrEqual(400);
      expect(
        res.status,
        `Expected non-5xx on unknown id for ${op.method} ${resolvedPath}, but got ${res.status}`
      ).toBeLessThan(500);

      const text = await res.text();
      expect(text, `Response body should not contain 'Exception'`).not.toContain('Exception');
      expect(text, `Response body should not contain stack trace`).not.toContain(
        'at org.springframework'
      );
      expect(text, `Response body should not contain stack trace`).not.toContain(
        'at com.financeos'
      );
      expect(text, `Response body should not contain stack trace`).not.toMatch(
        /\bat [a-zA-Z0-9_$.]+\([a-zA-Z0-9_$.]+:\d+\)/
      );
    });
  }
});
