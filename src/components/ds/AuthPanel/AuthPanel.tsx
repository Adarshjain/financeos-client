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

  if (!isFull) {
    return (
      <div
        className={cn(
          'bg-illus-mint relative overflow-hidden select-none w-full',
          className,
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 390 120"
          className="w-full block"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <filter
              id="auth-shadow-strip"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="6"
                floodColor="var(--ds-scrim)"
                floodOpacity="0.12"
              />
            </filter>
          </defs>

          {/* Background soft blob */}
          <circle
            cx="360"
            cy="10"
            r="80"
            fill="var(--ds-positive-tint)"
            opacity="0.75"
          />

          {/* Brand credit card */}
          <g transform="translate(24, 22) rotate(-6)">
            <rect
              width="150"
              height="88"
              rx="14"
              fill="var(--ds-brand)"
              filter="url(#auth-shadow-strip)"
            />
            <text
              x="14"
              y="24"
              fill="var(--ds-on-brand)"
              fontSize="10"
              fontWeight="800"
              letterSpacing="0.08em"
              opacity="0.9"
            >
              REGALIA
            </text>
            <text
              x="136"
              y="24"
              textAnchor="end"
              fill="var(--ds-on-brand)"
              fontSize="10"
              fontWeight="800"
            >
              ₹
            </text>
            <text
              x="14"
              y="62"
              fill="var(--ds-on-brand)"
              fontSize="11"
              fontWeight="800"
              letterSpacing="0.12em"
            >
              •••• 7741
            </text>
            <text
              x="14"
              y="76"
              fill="var(--ds-on-brand)"
              fontSize="9"
              fontWeight="500"
              opacity="0.8"
            >
              ARJUN MEHTA
            </text>
          </g>

          {/* Net worth card */}
          <g transform="translate(150, 56) rotate(3)">
            <rect
              width="150"
              height="58"
              rx="14"
              fill="var(--ds-bg-surface)"
              stroke="var(--ds-line)"
              filter="url(#auth-shadow-strip)"
            />
            <text
              x="12"
              y="20"
              fill="var(--ds-ink-4)"
              fontSize="10"
              fontWeight="800"
              letterSpacing="0.08em"
            >
              NET WORTH
            </text>
            <text
              x="12"
              y="42"
              fill="var(--ds-ink)"
              fontSize="15"
              fontWeight="800"
              fontFamily="var(--ds-font-display)"
            >
              ₹11.98L
            </text>
          </g>

          {/* Gold Coin */}
          <g transform="translate(322, 18) rotate(12)">
            <circle
              cx="20"
              cy="20"
              r="20"
              fill="var(--ds-illus-gold)"
              stroke="var(--ds-illus-gold-edge)"
              strokeWidth="3"
              filter="url(#auth-shadow-strip)"
            />
            <text
              x="20"
              y="26"
              textAnchor="middle"
              fill="var(--ds-warning-ink)"
              fontSize="16"
              fontWeight="800"
            >
              ₹
            </text>
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-illus-mint relative overflow-hidden select-none h-full min-h-screen p-space-48 flex flex-col justify-between',
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex items-center gap-space-10 relative">
        <div className="w-control-md h-control-md rounded-ds-md bg-brand text-on-brand font-extrabold flex items-center justify-center text-heading">
          ₹
        </div>
        <div className="text-title font-extrabold text-ink font-display">
          FinanceOS
        </div>
      </div>

      <div className="my-auto w-full max-w-xl">
        <svg viewBox="0 0 520 300" className="w-full block" fill="none">
          <defs>
            <filter
              id="auth-shadow-full"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="6"
                stdDeviation="8"
                floodColor="var(--ds-scrim)"
                floodOpacity="0.14"
              />
            </filter>
          </defs>

          {/* Background decorative soft blobs */}
          <circle
            cx="480"
            cy="30"
            r="120"
            fill="var(--ds-positive-tint)"
            opacity="0.6"
          />
          <circle
            cx="40"
            cy="240"
            r="80"
            fill="var(--ds-illus-gold)"
            opacity="0.35"
          />
          <circle
            cx="440"
            cy="260"
            r="60"
            fill="var(--ds-info-tint)"
            opacity="0.4"
          />

          {/* Brand credit card */}
          <g transform="translate(30, 40) rotate(-7)">
            <rect
              width="220"
              height="136"
              rx="14"
              fill="var(--ds-brand)"
              filter="url(#auth-shadow-full)"
            />
            <text
              x="16"
              y="30"
              fill="var(--ds-on-brand)"
              fontSize="11"
              fontWeight="800"
              letterSpacing="0.08em"
              opacity="0.9"
            >
              HDFC REGALIA GOLD
            </text>
            <text
              x="204"
              y="30"
              textAnchor="end"
              fill="var(--ds-on-brand)"
              fontSize="12"
              fontWeight="800"
            >
              ₹
            </text>
            <text
              x="16"
              y="96"
              fill="var(--ds-on-brand)"
              fontSize="15"
              fontWeight="800"
              letterSpacing="0.14em"
            >
              •••• 7741
            </text>
            <text
              x="16"
              y="118"
              fill="var(--ds-on-brand)"
              fontSize="10"
              fontWeight="500"
              opacity="0.85"
            >
              ARJUN MEHTA · 03/29
            </text>
          </g>

          {/* Net worth card with mini chart */}
          <g transform="translate(280, 20) rotate(4)">
            <rect
              width="210"
              height="110"
              rx="14"
              fill="var(--ds-bg-surface)"
              stroke="var(--ds-line)"
              filter="url(#auth-shadow-full)"
            />
            <text
              x="16"
              y="26"
              fill="var(--ds-ink-4)"
              fontSize="10"
              fontWeight="800"
              letterSpacing="0.08em"
            >
              NET WORTH
            </text>
            <text
              x="16"
              y="56"
              fill="var(--ds-ink)"
              fontSize="20"
              fontWeight="800"
              fontFamily="var(--ds-font-display)"
            >
              ₹11.98L
            </text>
            <path
              d="M16 95 L45 88 L75 92 L105 78 L135 82 L165 68 L194 60"
              fill="none"
              stroke="var(--ds-brand)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* Amex bill paid tile */}
          <g transform="translate(110, 190) rotate(-2)">
            <rect
              width="210"
              height="60"
              rx="14"
              fill="var(--ds-bg-surface)"
              stroke="var(--ds-line)"
              filter="url(#auth-shadow-full)"
            />
            <circle cx="30" cy="30" r="13" fill="var(--ds-hover)" />
            <text
              x="30"
              y="35"
              textAnchor="middle"
              fill="var(--ds-ink)"
              fontSize="12"
              fontWeight="800"
            >
              ✓
            </text>
            <text
              x="52"
              y="26"
              fill="var(--ds-ink)"
              fontSize="12"
              fontWeight="800"
            >
              Amex bill paid
            </text>
            <text
              x="52"
              y="44"
              fill="var(--ds-ink-3)"
              fontSize="11"
              fontWeight="500"
            >
              ₹33,900 · 2 days early
            </text>
          </g>

          {/* Gold Coin */}
          <g transform="translate(360, 160) rotate(12)">
            <circle
              cx="26"
              cy="26"
              r="26"
              fill="var(--ds-illus-gold)"
              stroke="var(--ds-illus-gold-edge)"
              strokeWidth="3"
              filter="url(#auth-shadow-full)"
            />
            <text
              x="26"
              y="34"
              textAnchor="middle"
              fill="var(--ds-warning-ink)"
              fontSize="20"
              fontWeight="800"
            >
              ₹
            </text>
          </g>

          {/* Rewards points tile */}
          <g transform="translate(330, 240) rotate(6)">
            <rect
              width="160"
              height="36"
              rx="10"
              fill="var(--ds-warning-tint)"
              stroke="var(--ds-warning-border)"
              filter="url(#auth-shadow-full)"
            />
            <text
              x="12"
              y="23"
              fill="var(--ds-warning-ink)"
              fontSize="11"
              fontWeight="700"
            >
              +600 pts · dining 5X
            </text>
          </g>
        </svg>
      </div>

      <div className="relative max-w-md">
        <div className="text-page-title font-extrabold tracking-tight text-ink leading-tight font-display">
          Every rupee, every card, every loan. One calm ledger.
        </div>
        <div className="text-body font-medium text-ink-2 mt-space-10 leading-relaxed font-text">
          Statements, bank alerts and brokers flow in. You see what needs you
          today and where the rest went.
        </div>
        <div className="flex gap-space-14 text-caption font-medium text-ink-3 mt-space-16 flex-wrap font-text">
          <span>Encrypted at rest</span>
          <span>·</span>
          <span>Read-only Gmail</span>
          <span>·</span>
          <span>Your keys, your data</span>
        </div>
      </div>
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
        ? 'You will need an invite code.'
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

        {/* Google sign in button with official Google mark */}
        <button
          type="button"
          onClick={onGoogleSignIn}
          className="h-control-xl w-full border border-line-strong rounded-ds-md bg-surface hover:bg-hover active:bg-hover text-body font-semibold text-ink flex items-center justify-center gap-space-8 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              fill="#4285F4" /* ds-allow: official Google brand logo */
              d="M22.6 12.2c0-.8-.1-1.4-.2-2H12v3.9h6c-.1 1-.8 2.5-2.3 3.5v2.8h3.7c2.1-2 3.2-4.9 3.2-8.2z"
            />
            <path
              fill="#34A853" /* ds-allow: official Google brand logo */
              d="M12 23c3 0 5.6-1 7.4-2.7l-3.7-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2v2.9A11 11 0 0 0 12 23z"
            />
            <path
              fill="#FBBC05" /* ds-allow: official Google brand logo */
              d="M5.8 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2A11 11 0 0 0 1 12c0 1.8.4 3.4 1.2 4.9z"
            />
            <path
              fill="#EA4335" /* ds-allow: official Google brand logo */
              d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.8 10c.9-2.7 3.3-4.6 6.2-4.6z"
            />
          </svg>
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
              autoComplete="one-time-code"
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
            autoComplete="email"
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
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => {
              setInternalPassword(e.target.value);
              onPasswordChange?.(e.target.value);
            }}
            required
          />

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
