import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
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

  it('links to /ds/settings from the Signed in section', () => {
    render(<DsIndexPage />);

    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByText('/ds/settings')).toBeDefined();
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/ds/settings');
  });

  it('links to /ds/inbox and /ds/upcoming from the Signed in section', () => {
    render(<DsIndexPage />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/ds/inbox');
    expect(hrefs).toContain('/ds/upcoming');
  });

  it('links every top-level /ds page, so a new page is never left off the index', () => {
    const groups = ['(app)', '(public)'].map((g) => path.resolve(process.cwd(), 'src/app/(ds)/ds', g));
    const routes = groups.flatMap((dir) =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'page.tsx')))
        .map((e) => `/ds/${e.name}`),
    );
    render(<DsIndexPage />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(hrefs, `${route} is missing from /ds`).toContain(route);
  });
});
