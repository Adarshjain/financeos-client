import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: [
    '../src/components/ds/**/*.mdx',
    '../src/components/ds/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/components/organisms/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
};

export default config;
