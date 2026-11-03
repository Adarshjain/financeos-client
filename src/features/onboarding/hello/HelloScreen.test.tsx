import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelloScreen, type HelloScreenProps } from './HelloScreen';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

const submitHello = vi.fn();
const startGmailOAuthToHome = vi.fn();
vi.mock('./helloActions', () => ({
  startGmailOAuthToHome: (...a: unknown[]) => startGmailOAuthToHome(...a),
  submitHello: (...a: unknown[]) => submitHello(...a),
}));

const props: HelloScreenProps = {
  displayName: 'Asha Rao',
  nameFromGoogle: true,
  birthDate: null,
  birthDateFromGoogle: false,
  hasGmail: false,
  today: '2026-11-03',
};

const BIRTH_WARNING = /Without it we can't open statements your bank locks with it\./;

beforeEach(() => {
  replace.mockReset();
  submitHello.mockReset().mockResolvedValue({ success: true, data: undefined });
  startGmailOAuthToHome.mockReset();
});

function tick() {
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('HelloScreen', () => {
  it('greets by first name, prefilled, with the Google caption and the step counter', () => {
    render(<HelloScreen {...props} />);
    expect(screen.getByRole('heading', { name: "Hi Asha. Let's find all your money." })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText(/From your Google account\. Change it/)).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('greets Hi there with no name, and has no counter or "Let\'s go" mix-up when Gmail is connected', () => {
    render(<HelloScreen {...props} displayName={null} nameFromGoogle={false} hasGmail />);
    expect(screen.getByRole('heading', { name: "Hi there. Let's find all your money." })).toBeInTheDocument();
    expect(screen.queryByText('1 of 2')).toBeNull();
    expect(screen.getByRole('button', { name: "Let's go" })).toBeInTheDocument();
  });

  it('the first press with an empty birth date warns and reads Continue anyway, without saving', () => {
    render(<HelloScreen {...props} />);
    tick();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(BIRTH_WARNING)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue anyway' })).toBeInTheDocument();
    expect(submitHello).not.toHaveBeenCalled();
  });

  it('Continue anyway proceeds with the empty values and moves to Connect Gmail', async () => {
    render(<HelloScreen {...props} />);
    tick();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue anyway' }));
    await waitFor(() => expect(screen.getByText('2 of 2')).toBeInTheDocument());
    expect(submitHello).toHaveBeenCalledWith({ displayName: 'Asha Rao', birthDate: '' });
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeInTheDocument();
  });

  it('consent is always required', () => {
    render(<HelloScreen {...props} birthDate="1990-04-05" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Tick this to continue.')).toBeInTheDocument();
    expect(submitHello).not.toHaveBeenCalled();
  });

  it('Skip goes Home; Hello with Gmail connected goes Home after saving', async () => {
    const { unmount } = render(<HelloScreen {...props} birthDate="1990-04-05" />);
    tick();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Skip' }));
    expect(replace).toHaveBeenCalledWith('/dashboard');
    unmount();

    replace.mockReset();
    render(<HelloScreen {...props} birthDate="1990-04-05" hasGmail />);
    tick();
    fireEvent.click(screen.getByRole('button', { name: "Let's go" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('Connect Gmail asks the server to come back to Home', async () => {
    startGmailOAuthToHome.mockResolvedValue({ success: false, error: { message: 'Nope' } });
    render(<HelloScreen {...props} birthDate="1990-04-05" />);
    tick();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Connect Gmail' }));
    expect(await screen.findByText('Nope')).toBeInTheDocument();
    expect(startGmailOAuthToHome).toHaveBeenCalled();
  });
});
