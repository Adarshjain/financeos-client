import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { CounterpartyResponse } from '@/lib/lending.types';

import { AddLendingProvider, useAddLending } from './AddLendingProvider';

vi.mock('./AddLendingDialog', () => ({
  AddLendingDialog: ({ initialPerson }: { initialPerson?: { name: string } }) => (
    <p>{initialPerson ? `dialog for ${initialPerson.name}` : 'dialog for nobody'}</p>
  ),
}));

const rahul = { id: 'p1', name: 'Rahul Sharma' } as CounterpartyResponse;

function Openers() {
  const { open, openFor } = useAddLending();
  return (
    <>
      <button onClick={() => openFor(rahul)}>open for Rahul</button>
      <button onClick={() => open()}>open plain</button>
    </>
  );
}

describe('AddLendingProvider openFor', () => {
  it('opens the dialog with that person, and a plain open afterwards starts without one', () => {
    render(
      <AddLendingProvider>
        <Openers />
      </AddLendingProvider>,
    );
    fireEvent.click(screen.getByText('open for Rahul'));
    expect(screen.getByText('dialog for Rahul Sharma')).toBeInTheDocument();
    fireEvent.click(screen.getByText('open plain'));
    expect(screen.getByText('dialog for nobody')).toBeInTheDocument();
  });
});
