import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { CounterpartyResponse } from '@/lib/lending.types';

import { AddLendingProvider, useAddLending } from './AddLendingProvider';

vi.mock('./AddLendingDialog', () => ({
  AddLendingDialog: ({ initialPerson, onRecorded }: { initialPerson?: { name: string }; onRecorded?: () => void }) => (
    <>
      <p>{initialPerson ? `dialog for ${initialPerson.name}` : 'dialog for nobody'}</p>
      <p>{onRecorded ? 'has onRecorded' : 'no onRecorded'}</p>
      <button onClick={onRecorded}>recorded</button>
    </>
  ),
}));

const rahul = { id: 'p1', name: 'Rahul Sharma' } as CounterpartyResponse;

const onRecorded = vi.fn();

function Openers() {
  const { open, openFor } = useAddLending();
  return (
    <>
      <button onClick={() => openFor(rahul, { onRecorded })}>open with callback</button>
      <button onClick={() => openFor(rahul)}>open for Rahul</button>
      <button onClick={() => open()}>open plain</button>
    </>
  );
}

describe('AddLendingProvider openFor', () => {
  it('opens the dialog with that person, and a plain open afterwards starts without one', async () => {
    render(
      <AddLendingProvider>
        <Openers />
      </AddLendingProvider>,
    );
    fireEvent.click(screen.getByText('open for Rahul'));
    expect(await screen.findByText('dialog for Rahul Sharma')).toBeInTheDocument();
    fireEvent.click(screen.getByText('open plain'));
    expect(await screen.findByText('dialog for nobody')).toBeInTheDocument();
  });

  it('hands the dialog the onRecorded of openFor, and a later plain open does not keep it', async () => {
    render(
      <AddLendingProvider>
        <Openers />
      </AddLendingProvider>,
    );
    fireEvent.click(screen.getByText('open for Rahul'));
    expect(await screen.findByText('no onRecorded')).toBeInTheDocument();
    fireEvent.click(screen.getByText('open with callback'));
    expect(await screen.findByText('has onRecorded')).toBeInTheDocument();
    fireEvent.click(screen.getByText('recorded'));
    expect(onRecorded).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('open plain'));
    expect(await screen.findByText('no onRecorded')).toBeInTheDocument();
  });
});
