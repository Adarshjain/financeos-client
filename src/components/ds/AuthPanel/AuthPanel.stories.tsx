import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { AuthMode, AuthPanel } from './AuthPanel';

const meta: Meta<typeof AuthPanel> = {
  title: 'DS/Screens/AuthPanel',
  component: AuthPanel,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof AuthPanel>;

export const Login: Story = {
  args: {
    mode: 'login',
    email: 'arjun@example.com',
  },
};

export const SignUp: Story = {
  args: {
    mode: 'signup',
    email: 'arjun@example.com',
    inviteCode: 'ALPHA-2026',
  },
};

export const SplitDesktop: Story = {
  args: {
    mode: 'login',
    layout: 'split',
  },
  parameters: {
    layout: 'fullscreen',
  },
};

const InteractiveAuthStory: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <div className="flex justify-center p-space-12">
      <AuthPanel
        mode={mode}
        onSwitchMode={(next) => setMode(next)}
        onSubmit={(data) => alert(JSON.stringify(data, null, 2))}
        onGoogleSignIn={() => alert('Continue with Google')}
      />
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveAuthStory />,
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 max-w-4xl items-start">
      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Login card
        </div>
        <AuthPanel mode="login" email="arjun@example.com" />
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Sign-up card (with invite code and explainer)
        </div>
        <AuthPanel
          mode="signup"
          email="arjun@example.com"
          inviteCode="INVITE-2026"
        />
      </div>
    </div>
  ),
};
