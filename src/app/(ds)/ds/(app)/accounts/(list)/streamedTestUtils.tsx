import { Writable } from 'node:stream';

import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';

import type {
  AccountsListData,
  AccountsResult,
} from '@/features/accounts/list/accountsListData';

/** The accounts list data as plain values; `toStreams` wraps it in the promises the page takes. */
export type PlainListData = AccountsResult & {
  bills: AccountsListData['bills'] extends Promise<infer T> ? T : never;
  rewards: AccountsListData['rewards'] extends Promise<infer T> ? T : never;
  netWorth: number | null;
  dayChangePct: number | null;
};

export function toStreams(data: PlainListData): AccountsListData {
  return {
    accounts: Promise.resolve({
      accounts: data.accounts,
      errorReference: data.errorReference,
    }),
    bills: Promise.resolve(data.bills),
    rewards: Promise.resolve(data.rewards),
    netWorth: Promise.resolve(data.netWorth),
    dayChangePct: Promise.resolve(data.dayChangePct),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Resolves every async Server Component in a tree, including those inside props such as the
 * rows handed to a table, so jsdom can render the result with Testing Library.
 */
export async function resolveDeep(node: unknown): Promise<unknown> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveDeep));
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<Record<string, unknown>>;
    const { type, props } = element;
    if (typeof type === 'function' && type.constructor.name === 'AsyncFunction') {
      return resolveDeep(await (type as (p: unknown) => Promise<unknown>)(props));
    }
    const entries = await Promise.all(
      Object.entries(props).map(async ([k, v]) => [k, await resolveDeep(v)] as const)
    );
    return React.cloneElement(element, Object.fromEntries(entries));
  }
  if (isPlainObject(node)) {
    const entries = await Promise.all(
      Object.entries(node).map(async ([k, v]) => [k, await resolveDeep(v)] as const)
    );
    return Object.fromEntries(entries);
  }
  return node;
}

/**
 * The HTML React streams for the first flush: Suspense boundaries whose data has not arrived
 * show their fallback. Aborts once the shell is ready, leaving pending boundaries unresolved.
 */
export function renderShellHtml(ui: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new Writable({
      write(chunk: Buffer, _enc, done) {
        html += chunk.toString();
        done();
      },
    });
    sink.on('finish', () => resolve(html));
    const stream = renderToPipeableStream(ui, {
      onShellReady() {
        stream.pipe(sink);
        setTimeout(() => stream.abort(), 0);
      },
      onShellError: reject,
      onError: () => {},
    });
  });
}
