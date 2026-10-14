import React, { forwardRef, useState } from 'react';

import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { cn } from '../cn';
import { TextField } from '../TextField/TextField';

export type AuthMode = 'login' | 'signup';
export type AuthLayout = 'card' | 'split';

export interface AuthPanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSubmit' | 'title'> {
  /** Mode: 'login' (default) or 'signup' */
  mode?: AuthMode;
  /** Layout: 'card' (compact/phone card) or 'split' (desktop full-page split) */
  layout?: AuthLayout;

  /** Title override */
  title?: React.ReactNode;
  /** Subtitle override */
  subtitle?: React.ReactNode;

  /** Google sign-in click handler */
  onGoogleSignIn?: () => void;
  /** Form submission handler */
  onSubmit?: (data: {
    email: string;
    password?: string;
    inviteCode?: string;
  }) => void;
  /** Mode toggle handler */
  onSwitchMode?: (mode: AuthMode) => void;

  /** Controlled email value */
  email?: string;
  /** Email change callback */
  onEmailChange?: (email: string) => void;

  /** Controlled password value */
  password?: string;
  /** Password change callback */
  onPasswordChange?: (password: string) => void;

  /** Controlled invite code value (signup mode) */
  inviteCode?: string;
  /** Invite code change callback */
  onInviteCodeChange?: (code: string) => void;

  /** Loading state for primary submit button */
  loading?: boolean;
  /** Error message to display */
  error?: React.ReactNode;
}

export const AuthIllustration: React.FC<{
  className?: string;
  variant?: 'strip' | 'full';
}> = ({ className, variant = 'strip' }) => {
  const isFull = variant === 'full';

  return (
    <div
      className={cn(
        'bg-illus-mint relative overflow-hidden select-none',
        isFull
          ? 'h-full min-h-screen p-space-48 flex flex-col justify-between'
          : 'h-space-48 w-full',
        className,
      )}
      style={isFull ? undefined : { height: 120 }}
      aria-hidden="true"
    >
      {/* Background soft blob */}
      <div
        className="absolute rounded-ds-pill bg-positive-tint opacity-75"
        style={{
          width: isFull ? 320 : 160,
          height: isFull ? 320 : 160,
          right: isFull ? -60 : -40,
          top: isFull ? -60 : -40,
        }}
      />

      {isFull && (
        <div className="flex items-center gap-space-10 relative z-1">
          <div className="w-space-32 h-space-32 rounded-ds-md bg-brand text-on-brand font-extrabold flex items-center justify-center text-heading">
            ₹
          </div>
          <div className="text-title font-extrabold text-ink">FinanceOS</div>
        </div>
      )}

      {/* Floating scene elements */}
      <div
        className={cn(
          'relative',
          isFull ? 'my-auto h-space-48' : 'w-full h-full',
        )}
        style={isFull ? { height: 260 } : undefined}
      >
        {/* Brand credit card */}
        <div
          className="absolute rounded-ds-xl bg-brand text-on-brand shadow-raise flex flex-col justify-between p-space-12"
          style={{
            left: isFull ? '10%' : 24,
            top: isFull ? 30 : 22,
            width: isFull ? 200 : 150,
            height: isFull ? 120 : 88,
            transform: 'rotate(-6deg)',
          }}
        >
          <div className="flex justify-between text-overline font-extrabold tracking-wider opacity-90">
            <span>REGALIA</span>
            <span>₹</span>
          </div>
          <div>
            <div className="text-caption font-extrabold tracking-widest">
              •••• 7741
            </div>
            <div className="text-overline opacity-80 mt-space-2">
              ARJUN MEHTA
            </div>
          </div>
        </div>

        {/* Net worth card with mini chart */}
        <div
          className="absolute rounded-ds-xl bg-surface border border-line shadow-raise p-space-10"
          style={{
            left: isFull ? '42%' : 150,
            top: isFull ? 80 : 56,
            width: isFull ? 180 : 150,
            transform: 'rotate(3deg)',
          }}
        >
          <div className="text-overline uppercase font-bold text-ink-4">
            Net worth
          </div>
          <div className="text-body-strong font-display font-extrabold text-ink mt-space-2">
            ₹11.98L
          </div>
          <svg
            className="w-full mt-space-2 text-brand"
            height="18"
            viewBox="0 0 100 18"
            fill="none"
          >
            <path
              d="M0 16 L20 14 L40 15 L60 10 L80 11 L100 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Gold Coin */}
        <div
          className="absolute rounded-ds-pill bg-illus-gold border-4 border-illus-gold-edge shadow-raise flex items-center justify-center font-extrabold text-warning-ink"
          style={{
            right: isFull ? '20%' : 28,
            top: isFull ? 20 : 18,
            width: isFull ? 48 : 40,
            height: isFull ? 48 : 40,
            transform: 'rotate(12deg)',
          }}
        >
          ₹
        </div>
      </div>

      {isFull && (
        <div className="relative z-1 max-w-md">
          <div className="text-page-title font-extrabold tracking-tight text-ink leading-tight">
            Every rupee, every card, every loan. One calm ledger.
          </div>
          <div className="text-body font-medium text-ink-2 mt-space-8 leading-relaxed">
            Statements, bank alerts and brokers flow in. You see what needs you
            today and where the rest went.
          </div>
          <div className="flex gap-space-12 text-caption font-medium text-ink-3 mt-space-16 flex-wrap">
            <span>Encrypted at rest</span>
            <span>·</span>
            <span>Read-only Gmail</span>
            <span>·</span>
            <span>Your keys, your data</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const AuthPanel = forwardRef<HTMLDivElement, AuthPanelProps>(
  (
    {
      mode = 'login',
      layout = 'card',
      title,
      subtitle,
      onGoogleSignIn,
      onSubmit,
      onSwitchMode,
      email: controlledEmail,
      onEmailChange,
      password: controlledPassword,
      onPasswordChange,
      inviteCode: controlledInviteCode,
      onInviteCodeChange,
      loading = false,
      error,
      className,
      ...props
    },
    ref,
  ) => {
    const [internalEmail, setInternalEmail] = useState('');
    const [internalPassword, setInternalPassword] = useState('');
    const [internalInviteCode, setInternalInviteCode] = useState('');

    const email = controlledEmail ?? internalEmail;
    const password = controlledPassword ?? internalPassword;
    const inviteCode = controlledInviteCode ?? internalInviteCode;

    const isSignup = mode === 'signup';
    const isSplit = layout === 'split';

    const headingText =
      title ?? (isSignup ? 'Create your account' : 'Welcome back');
    const subText =
      subtitle ??
      (isSignup
        ? 'Start your calm ledger with an invite code.'
        : 'Sign in to see your money in one place.');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit?.({
        email,
        password,
        inviteCode: isSignup ? inviteCode : undefined,
      });
    };

    const formContent = (
      <div className="w-full max-w-sm flex flex-col gap-space-12 select-none">
        <div>
          <div className="text-screen-title font-display font-extrabold text-ink">
            {headingText}
          </div>
          <div className="text-label font-medium text-ink-3 mt-space-2">
            {subText}
          </div>
        </div>

        {error && (
          <div className="p-space-8 rounded-ds-md bg-danger-tint border border-danger-border text-caption font-semibold text-danger">
            {error}
          </div>
        )}

        {/* Google sign in button */}
        <button
          type="button"
          onClick={onGoogleSignIn}
          className="h-control-xl w-full border border-line-strong rounded-ds-md bg-surface hover:bg-hover active:bg-hover text-body font-semibold text-ink flex items-center justify-center gap-space-8 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <span className="font-extrabold text-info">G</span>
          <span>Continue with Google</span>
        </button>

        {/* Or divider */}
        <div className="flex items-center gap-space-10 my-space-4 text-caption font-bold text-ink-4">
          <span className="flex-1 h-px bg-line" />
          <span>or</span>
          <span className="flex-1 h-px bg-line" />
        </div>

        {/* Form fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-12">
          {isSignup && (
            <TextField
              label="Invite code"
              placeholder="INVITE-2026"
              value={inviteCode}
              onChange={(e) => {
                setInternalInviteCode(e.target.value);
                onInviteCodeChange?.(e.target.value);
              }}
              required
            />
          )}

          <TextField
            label="Email"
            type="email"
            placeholder="arjun@example.com"
            value={email}
            onChange={(e) => {
              setInternalEmail(e.target.value);
              onEmailChange?.(e.target.value);
            }}
            required
          />

          <TextField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setInternalPassword(e.target.value);
              onPasswordChange?.(e.target.value);
            }}
            required
          />

          {isSignup && (
            <div className="flex flex-col gap-space-6 p-space-10 rounded-ds-md bg-subtle border border-line-soft text-caption text-ink-3 mt-space-2">
              <div className="flex items-center gap-space-8">
                <span className="w-space-16 h-space-16 rounded-ds-pill bg-brand text-on-brand font-bold text-center leading-none flex items-center justify-center shrink-0">
                  1
                </span>
                <span>Enter your invite code</span>
              </div>
              <div className="flex items-center gap-space-8">
                <span className="w-space-16 h-space-16 rounded-ds-pill bg-brand text-on-brand font-bold text-center leading-none flex items-center justify-center shrink-0">
                  2
                </span>
                <span>Connect accounts via read-only sync</span>
              </div>
              <div className="flex items-center gap-space-8">
                <span className="w-space-16 h-space-16 rounded-ds-pill bg-brand text-on-brand font-bold text-center leading-none flex items-center justify-center shrink-0">
                  3
                </span>
                <span>Review your calm daily ledger</span>
              </div>
            </div>
          )}

          <Button
            size="xl"
            variant="primary"
            type="submit"
            loading={loading}
            className="w-full mt-space-4"
          >
            {isSignup ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        {/* Footer switch */}
        <div className="text-label text-ink-3 text-center mt-space-6">
          {isSignup ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode?.('login')}
                className="font-bold text-ink underline hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode?.('signup')}
                className="font-bold text-ink underline hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Create an account
              </button>{' '}
              with your invite code.
            </>
          )}
        </div>
      </div>
    );

    if (isSplit) {
      return (
        <div
          ref={ref}
          className={cn(
            'min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-canvas',
            className,
          )}
          {...props}
        >
          <AuthIllustration variant="full" />
          <div className="flex items-center justify-center p-space-20 lg:p-space-40 bg-surface">
            {formContent}
          </div>
        </div>
      );
    }

    return (
      <Card
        ref={ref}
        className={cn('p-0 overflow-hidden max-w-sm w-full', className)}
        {...props}
      >
        <AuthIllustration variant="strip" />
        <div className="p-space-20">{formContent}</div>
      </Card>
    );
  },
);

AuthPanel.displayName = 'AuthPanel';
