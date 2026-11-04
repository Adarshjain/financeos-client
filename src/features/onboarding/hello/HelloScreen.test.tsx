import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelloScreen, type HelloScreenProps } from './HelloScreen';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

const submitHello = vi.fn();
const startGmailOAuthToHome = vi.fn();
const finishHello = vi.fn();
vi.mock('./helloActions', () => ({
  finishHello: (...a: unknown[]) => finishHello(...a),
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
  finishHello.mockReset().mockResolvedValue({ success: true, data: undefined });
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

  it('shows the step bar only in the two-step flow', () => {
    const { unmount } = render(<HelloScreen {...props} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    unmount();
    render(<HelloScreen {...props} hasGmail />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('1 of 2')).toBeNull();
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
    expect(submitHello).toHaveBeenCalledWith({ displayName: 'Asha Rao', birthDate: '', finish: false });
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeInTheDocument();
  });

  it('consent is always required', () => {
    render(<HelloScreen {...props} birthDate="1990-04-05" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Agree to the Terms and Privacy policy to continue.')).toBeInTheDocument();
    expect(submitHello).not.toHaveBeenCalled();
  });

  it('Skip goes Home; Hello with Gmail connected goes Home after saving', async () => {
    const { unmount } = render(<HelloScreen {...props} birthDate="1990-04-05" />);
    tick();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Skip' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    expect(finishHello).toHaveBeenCalledTimes(1);
    unmount();

    replace.mockReset();
    finishHello.mockClear();
    render(<HelloScreen {...props} birthDate="1990-04-05" hasGmail />);
    tick();
    fireEvent.click(screen.getByRole('button', { name: "Let's go" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    // One step: default finish (not sent as false), and no separate finish call.
    expect(submitHello).toHaveBeenCalledWith(expect.not.objectContaining({ finish: false }));
    expect(finishHello).not.toHaveBeenCalled();
  });

  it('step 1 of two saves without finishing and never calls finish', async () => {
    render(<HelloScreen {...props} birthDate="1990-04-05" />);
    tick();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText('2 of 2');
    expect(submitHello).toHaveBeenCalledWith(expect.objectContaining({ finish: false }));
    expect(finishHello).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('a saved step 1 resumes on step 2 (refresh stays on step 2); Back returns to step 1', async () => {
    render(<HelloScreen {...props} birthDate="1990-04-05" helloProfileSaved />);
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Connect the Gmail your bank writes to' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('a saved step 1 with Gmail already connected stays on the single screen', () => {
    render(<HelloScreen {...props} hasGmail helloProfileSaved />);
    expect(screen.getByRole('button', { name: "Let's go" })).toBeInTheDocument();
  });

  it('a failed finish shows the error and stays on step 2', async () => {
    finishHello.mockResolvedValue({ success: false, error: { message: 'Try later' } });
    render(<HelloScreen {...props} helloProfileSaved />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
    expect(await screen.findByText('Try later')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('puts Back, Skip, Connect Gmail in the footer in that order; none on step 1', () => {
    const { unmount } = render(<HelloScreen {...props} />);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    unmount();
    render(<HelloScreen {...props} helloProfileSaved />);
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names.filter((n) => ['Back', 'Skip', 'Connect Gmail'].includes(n ?? ''))).toEqual(['Back', 'Skip', 'Connect Gmail']);
  });

  it('the name field has a placeholder and the warnings sit on the fields', () => {
    render(<HelloScreen {...props} />);
    expect(screen.getByPlaceholderText('Your full name')).toBeInTheDocument();
  });

  it('Back on Connect Gmail returns to the Hello step with the values kept', async () => {
    render(<HelloScreen {...props} birthDate="1990-04-05" />);
    tick();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: "Hi Asha. Let's find all your money." })).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Asha Rao')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
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

  describe('Skip confirm dialog', () => {
    const open = () => {
      render(<HelloScreen {...props} helloProfileSaved />);
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    };

    it('Skip opens the dialog without finishing', async () => {
      open();
      expect(await screen.findByRole('dialog', { name: 'Continue without Gmail?' })).toBeInTheDocument();
      expect(screen.getByText(/You can connect it later in Settings\./)).toBeInTheDocument();
      expect(finishHello).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
    });

    it('Skip for now finishes and goes Home', async () => {
      open();
      fireEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
      await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
      expect(finishHello).toHaveBeenCalledTimes(1);
    });

    it('Connect Gmail in the dialog starts OAuth and closes it', async () => {
      startGmailOAuthToHome.mockResolvedValue({ success: false, error: { message: 'Nope' } });
      open();
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Connect Gmail' }));
      await waitFor(() => expect(startGmailOAuthToHome).toHaveBeenCalledTimes(1));
      expect(await screen.findByText('Nope')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(finishHello).not.toHaveBeenCalled();
    });

    it('a failed finish closes the dialog and shows the error', async () => {
      finishHello.mockResolvedValue({ success: false, error: { message: 'Try later' } });
      open();
      fireEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
      expect(await screen.findByText('Try later')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('Escape closes it and stays on step 2 with nothing called', async () => {
      open();
      await screen.findByRole('dialog');
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.getByText('2 of 2')).toBeInTheDocument();
      expect(finishHello).not.toHaveBeenCalled();
      expect(startGmailOAuthToHome).not.toHaveBeenCalled();
      expect(replace).not.toHaveBeenCalled();
    });
  });
});
