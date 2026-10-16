import './preview.css';
import '../design-system/tokens.css';
import '../src/app/globals.css';

import type { Decorator, Preview } from '@storybook/react';
import React, { useEffect } from 'react';

const customViewports = {
  phone: {
    name: 'Phone (390px)',
    styles: {
      width: '390px',
      height: '844px',
    },
    type: 'mobile',
  },
  desktop: {
    name: 'Desktop (1440px)',
    styles: {
      width: '1440px',
      height: '900px',
    },
    type: 'desktop',
  },
};

function ThemeWrapper({
  theme,
  children,
}: {
  theme: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-canvas text-ink font-text antialiased p-space-16">
        {children}
      </div>
    </div>
  );
}

const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme as string) || 'light';
  return (
    <ThemeWrapper theme={theme}>
      <Story />
    </ThemeWrapper>
  );
};

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    docs: {
      controls: {
        disable: true,
      },
    },
    viewport: {
      viewports: customViewports,
    },
    layout: 'fullscreen',
    options: {
      storySort: (a, b) => {
        if (a.title !== b.title) return a.title.localeCompare(b.title, undefined, { numeric: true });
        const rank = (e) => (e.type === 'docs' ? 0 : 1);
        return rank(a) - rank(b);
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
};

export default preview;
