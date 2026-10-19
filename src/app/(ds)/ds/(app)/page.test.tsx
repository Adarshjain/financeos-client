import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import DsIndexPage from './page';

describe('DsIndexPage', () => {
  it('renders Signed out section with links to /ds/login, /ds/signup, /ds/offline', () => {
    render(<DsIndexPage />);

    expect(screen.getByText('Signed out')).toBeDefined();
    expect(screen.getByText('Sign in')).toBeDefined();
    expect(screen.getByText('/ds/login')).toBeDefined();
    expect(screen.getByText('Sign up')).toBeDefined();
    expect(screen.getByText('/ds/signup')).toBeDefined();
    expect(screen.getByText('Offline')).toBeDefined();
    expect(screen.getByText('/ds/offline')).toBeDefined();

    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/ds/login');
    expect(hrefs).toContain('/ds/signup');
    expect(hrefs).toContain('/ds/offline');
  });

  it('renders Signed in section with a link to /ds/accounts', () => {
    render(<DsIndexPage />);

    expect(screen.getByText('Signed in')).toBeDefined();
    expect(screen.getByText('Accounts')).toBeDefined();
    expect(screen.getByText('/ds/accounts')).toBeDefined();
  });
});
