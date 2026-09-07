import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { RootCauseCard } from '@/app/(protected)/debug/RootCauseCard';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';

describe('RootCauseCard', () => {
  it('renders badge for each kind', () => {
    const kinds: Array<{ kind: string; text: string }> = [
      { kind: 'SERVER_EXCEPTION', text: 'Server Exception' },
      { kind: 'UPSTREAM_FAILURE', text: 'Upstream Failure' },
      { kind: 'CLIENT_REJECTED', text: 'Client Rejected (4xx)' },
      { kind: 'UNAUTHENTICATED', text: 'Unauthenticated (401)' },
      { kind: 'FORBIDDEN', text: 'Forbidden (403)' },
      { kind: 'RATE_LIMITED', text: 'Rate Limited (429)' },
      { kind: 'INCOMPLETE', text: 'Incomplete' },
      { kind: 'NOT_FOUND_IN_LOGS', text: 'Not Found in Logs' },
      { kind: 'UNKNOWN_KIND', text: 'Not Found in Logs' },
    ];

    for (const { kind, text } of kinds) {
      const rootCause: DiagnosticsLookupResponse['rootCause'] = {
        kind,
        headline: `Headline for ${kind}`,
        detail: `Detail for ${kind}`,
        hints: [],
      };

      const { unmount } = render(<RootCauseCard rootCause={rootCause} />);
      expect(screen.getByText(text)).toBeInTheDocument();
      unmount();
    }
  });

  it('renders exceptionClass, oraCode, rootFrame, and hints list when present', () => {
    const rootCause: DiagnosticsLookupResponse['rootCause'] = {
      kind: 'SERVER_EXCEPTION',
      headline: 'Server Exception (ConstraintViolationException) [ORA-00001]',
      detail: 'unique constraint violated',
      exceptionClass: 'org.hibernate.exception.ConstraintViolationException',
      oraCode: 'ORA-00001',
      rootFrame: 'com.financeos.domain.AccountService.create(AccountService.java:50)',
      hints: ['Check unique index constraint', 'Retry with another identifier'],
    };

    render(<RootCauseCard rootCause={rootCause} />);

    expect(screen.getByText('org.hibernate.exception.ConstraintViolationException')).toBeInTheDocument();
    expect(screen.getByText('ORA-00001')).toBeInTheDocument();
    expect(screen.getByText(/com\.financeos\.domain\.AccountService/)).toBeInTheDocument();
    expect(screen.getByText('Check unique index constraint')).toBeInTheDocument();
    expect(screen.getByText('Retry with another identifier')).toBeInTheDocument();
  });

  it('does not render exception/oraCode grid when all are absent', () => {
    const rootCause: DiagnosticsLookupResponse['rootCause'] = {
      kind: 'INCOMPLETE',
      headline: 'Request succeeded on server',
      detail: 'No exception occurred',
      hints: [],
    };

    render(<RootCauseCard rootCause={rootCause} />);

    expect(screen.queryByText(/Oracle Code:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Exception:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Root Frame:/)).not.toBeInTheDocument();
  });
});
