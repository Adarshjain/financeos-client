import type { BrowserContext, CDPSession, Page } from '@playwright/test';

export interface VirtualAuthenticator {
  cdp: CDPSession;
  authenticatorId: string;
  /** Face ID / fingerprint answers (true) or fails (false) from now on. */
  setUserVerified(verified: boolean): Promise<void>;
}

/** A Chromium CDP virtual platform authenticator (WebKit has none: iOS is checked by hand). */
export async function addVirtualAuthenticator(context: BrowserContext, page: Page): Promise<VirtualAuthenticator> {
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  return {
    cdp,
    authenticatorId,
    setUserVerified: async (isUserVerified) => {
      await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified });
    },
  };
}
