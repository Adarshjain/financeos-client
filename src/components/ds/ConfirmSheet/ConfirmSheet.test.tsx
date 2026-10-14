import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmSheet, ConfirmSheetShell } from './ConfirmSheet';

describe('ConfirmSheetShell', () => {
  it('renders title, description and impact items', () => {
    render(
      <ConfirmSheetShell
        title="Delete statement"
        description="Removes the Oct 2026 statement and what it added to this account."
        impact={[
          '6 transactions it created will be deleted.',
          '2 email alerts go back to review as unreconciled.',
        ]}
        confirmLabel="Confirm Delete"
      />,
    );

    expect(screen.getByText('Delete statement')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Removes the Oct 2026 statement and what it added to this account.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('6 transactions it created will be deleted.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('2 email alerts go back to review as unreconciled.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirm Delete' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('triggers onConfirm and onCancel callbacks', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmSheetShell
        title="Discard unsaved changes?"
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('renders alternative action button and triggers callback', () => {
    const handleAlternative = vi.fn();

    render(
      <ConfirmSheetShell
        title="Delete account"
        alternativeLabel="Close instead"
        confirmLabel="Delete"
        onAlternative={handleAlternative}
      />,
    );

    const altButton = screen.getByRole('button', { name: 'Close instead' });
    expect(altButton).toBeInTheDocument();
    fireEvent.click(altButton);
    expect(handleAlternative).toHaveBeenCalledTimes(1);
  });

  it('shows checking impact loading message and disables confirm button', () => {
    render(
      <ConfirmSheetShell
        title="Delete Swiggy Bangalore · ₹1,249?"
        isCheckingImpact
        checkingMessage="Checking what will be affected…"
        confirmLabel="Delete"
      />,
    );

    expect(
      screen.getByText('Checking what will be affected…'),
    ).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    expect(confirmButton).toBeDisabled();
  });
});

describe('ConfirmSheet Modal', () => {
  it('opens and closes via modal interaction', () => {
    const handleConfirm = vi.fn();

    render(
      <ConfirmSheet
        defaultOpen
        title="Delete statement"
        description="Removes statement"
        confirmLabel="Delete"
        onConfirm={handleConfirm}
      />,
    );

    expect(
      screen.getAllByText('Delete statement').length,
    ).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
