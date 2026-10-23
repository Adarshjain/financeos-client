import React, { forwardRef } from 'react';

import { cn, Icon } from '@/components/ds';

import { Logo } from '../Logo/Logo';

export interface IllustrationProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 'signin': Auth sign-in artwork with card, net worth, bill paid and coin
   * 'signup': Setup sign-up artwork with statement, Gmail, card advice and 3 steps
   * 'offline': Sleeping ₹ coin under a cloud (for EmptyState offline)
   * 'notfound': ₹ coin holding a magnifying glass with a question mark (for not-found pages)
   * 'error': ₹ coin tipped over with a crossed plaster and dizzy sparks (for error pages)
   */
  variant: 'signin' | 'signup' | 'offline' | 'notfound' | 'error';
}

/**
 * Flat artwork for sign-in, sign-up, offline and empty screens.
 * Uses design system tokens exclusively. Decorative and aria-hidden.
 */
export const Illustration = forwardRef<HTMLDivElement, IllustrationProps>(
  ({ variant, className, ...props }, ref) => {
    if (variant === 'offline') {
      return (
        <div
          ref={ref}
          aria-hidden="true"
          className={cn('inline-flex items-center justify-center shrink-0', className)}
          {...props}
        >
          <svg
            width="84"
            height="64"
            viewBox="0 0 84 64"
            aria-hidden="true"
            className="overflow-visible"
          >
            <ellipse cx="44" cy="22" rx="26" ry="14" fill="var(--ds-line-soft)" />
            <circle
              cx="40"
              cy="44"
              r="16"
              fill="var(--ds-accent-gold)"
              stroke="var(--ds-accent-gold-strong)"
              strokeWidth={3}
            />
            <text
              x="40"
              y="50"
              textAnchor="middle"
              fontFamily="var(--ds-font-text),Figtree,sans-serif"
              fontWeight="800"
              fontSize="16"
              fill="var(--ds-warning-ink)"
            >
              ₹
            </text>
            <text
              x="62"
              y="12"
              fontFamily="var(--ds-font-text),Figtree,sans-serif"
              fontWeight="800"
              fontSize="11"
              fill="var(--ds-ink-4)"
            >
              z z
            </text>
          </svg>
        </div>
      );
    }

    if (variant === 'notfound') {
      return (
        <div
          ref={ref}
          aria-hidden="true"
          className={cn('inline-flex items-center justify-center shrink-0', className)}
          {...props}
        >
          <svg
            width="84"
            height="64"
            viewBox="0 0 84 64"
            aria-hidden="true"
            className="overflow-visible"
          >
            <ellipse cx="38" cy="60" rx="30" ry="4" fill="var(--ds-line-soft)" />
            <circle
              cx="30"
              cy="42"
              r="16"
              fill="var(--ds-accent-gold)"
              stroke="var(--ds-accent-gold-strong)"
              strokeWidth={3}
            />
            <text
              x="30"
              y="48"
              textAnchor="middle"
              fontFamily="var(--ds-font-text),Figtree,sans-serif"
              fontWeight="800"
              fontSize="16"
              fill="var(--ds-warning-ink)"
            >
              ₹
            </text>
            <line
              x1="43"
              y1="32"
              x2="50"
              y2="24"
              stroke="var(--ds-ink-3)"
              strokeWidth={4}
              strokeLinecap="round"
            />
            <circle
              cx="60"
              cy="16"
              r="13"
              fill="var(--ds-line-soft)"
              stroke="var(--ds-ink-3)"
              strokeWidth={3}
            />
            <text
              x="60"
              y="22"
              textAnchor="middle"
              fontFamily="var(--ds-font-text),Figtree,sans-serif"
              fontWeight="800"
              fontSize="16"
              fill="var(--ds-ink-3)"
            >
              ?
            </text>
          </svg>
        </div>
      );
    }

    if (variant === 'error') {
      return (
        <div
          ref={ref}
          aria-hidden="true"
          className={cn('inline-flex items-center justify-center shrink-0', className)}
          {...props}
        >
          <svg
            width="84"
            height="64"
            viewBox="0 0 84 64"
            aria-hidden="true"
            className="overflow-visible"
          >
            <ellipse cx="42" cy="60" rx="24" ry="4" fill="var(--ds-line-soft)" />
            <g transform="rotate(-18 42 40)">
              <circle
                cx="42"
                cy="40"
                r="19"
                fill="var(--ds-accent-gold)"
                stroke="var(--ds-accent-gold-strong)"
                strokeWidth={3}
              />
              <text
                x="42"
                y="46"
                textAnchor="middle"
                fontFamily="var(--ds-font-text),Figtree,sans-serif"
                fontWeight="800"
                fontSize="18"
                fill="var(--ds-warning-ink)"
              >
                ₹
              </text>
              <rect
                x="35"
                y="17"
                width="16"
                height="6"
                rx="3"
                transform="rotate(45 43 20)"
                fill="var(--ds-danger-tint)"
                stroke="var(--ds-danger)"
                strokeWidth={1.5}
              />
              <rect
                x="35"
                y="17"
                width="16"
                height="6"
                rx="3"
                transform="rotate(-45 43 20)"
                fill="var(--ds-danger-tint)"
                stroke="var(--ds-danger)"
                strokeWidth={1.5}
              />
            </g>
            <path d="M26 8 L27.5 12 L31.5 13.5 L27.5 15 L26 19 L24.5 15 L20.5 13.5 L24.5 12 Z" fill="var(--ds-accent-gold-strong)" />
            <path d="M44 0 L45.5 4 L49.5 5.5 L45.5 7 L44 11 L42.5 7 L38.5 5.5 L42.5 4 Z" fill="var(--ds-accent-gold-strong)" />
            <path d="M62 8 L63.5 12 L67.5 13.5 L63.5 15 L62 19 L60.5 15 L56.5 13.5 L60.5 12 Z" fill="var(--ds-accent-gold-strong)" />
          </svg>
        </div>
      );
    }

    if (variant === 'signup') {
      return (
        <div
          ref={ref}
          aria-hidden="true"
          className={cn(
            'bg-accent-mint text-ink p-space-20 pb-0 desk:p-space-48 flex flex-col justify-start desk:justify-between gap-space-8 desk:gap-0 relative overflow-hidden select-none',
            className,
          )}
          {...props}
        >
          {/* Decorative tint blobs */}
          <div className="w-60 h-60 bg-info-tint rounded-ds-pill absolute -left-20 -top-14 opacity-90 pointer-events-none" />
          <div className="w-48 h-48 bg-warning-tint rounded-ds-pill absolute -right-16 top-40 opacity-85 pointer-events-none" />
          <div className="w-36 h-36 bg-positive-tint rounded-ds-pill absolute left-1/3 -bottom-10 opacity-90 pointer-events-none" />

          {/* Logo mark + wordmark */}
          <div className="relative z-10">
            <Logo variant="full" />
          </div>

          {/* Setup artwork scene (shrinks on mobile) */}
          <div className="relative h-36 desk:h-72 mt-space-8 mb-0 desk:my-space-24 shrink-0 origin-center scale-90 desk:scale-100">
            {/* Statement imported tile */}
            <div className="absolute left-4 top-4 w-56 bg-surface border border-line rounded-ds-xl shadow-level-1 p-space-12 -rotate-3">
              <div className="flex items-center gap-space-8">
                <span className="w-7 h-7 rounded-ds-md bg-brand-tint text-brand flex items-center justify-center font-bold text-caption shrink-0">
                  PDF
                </span>
                <div>
                  <div className="text-label font-bold text-ink">Regalia statement</div>
                  <div className="text-caption text-ink-3">8 rows · bill ₹44,319</div>
                </div>
              </div>
              <div className="h-space-4 w-full bg-line-soft rounded-ds-pill overflow-hidden mt-space-10">
                <div className="h-full w-full bg-positive rounded-ds-pill" />
              </div>
              <div className="text-caption text-positive-strong font-bold mt-space-6 flex items-center gap-space-4">
                <span>Imported in 4 s</span>
                <Icon name="check" size="sm" />
              </div>
            </div>

            {/* Gmail connected tile */}
            <div className="absolute right-4 top-0 bg-surface border border-line rounded-ds-xl shadow-level-1 px-space-14 py-space-10 flex items-center gap-space-10 rotate-3">
              <span className="w-7 h-7 rounded-ds-pill bg-info-tint text-info flex items-center justify-center font-bold text-caption shrink-0">
                @
              </span>
              <div>
                <div className="text-label font-bold text-ink">Gmail connected</div>
                <div className="text-caption text-ink-3">41 alerts became transactions</div>
              </div>
            </div>

            {/* Card recommendation tile */}
            <div className="absolute right-12 bottom-2 bg-surface border border-line rounded-ds-xl shadow-level-1 px-space-14 py-space-10 -rotate-2">
              <div className="text-caption font-semibold text-ink-3">
                Which card for ₹4,500 dining?
              </div>
              <div className="text-body-strong font-bold text-positive-strong mt-space-2">
                Regalia · earns ₹300 ✦
              </div>
            </div>

            {/* Lending reminder tile */}
            <div className="absolute left-20 bottom-0 bg-info-tint border border-line rounded-ds-xl shadow-level-1 px-space-12 py-space-8 text-caption font-bold text-info rotate-3">
              Rahul owes you ₹15,000 · 28 Oct
            </div>
          </div>

          {/* Copy (hides on phone) */}
          <div className="relative z-10 flex-col hidden desk:flex">
            <h1 className="text-page-title font-extrabold tracking-tight text-ink max-w-md leading-tight">
              Set up takes about ten minutes.
            </h1>
            <div className="mt-space-16 flex flex-col gap-space-10">
              <div className="flex items-start gap-space-10 text-body text-neutral-ink">
                <b className="w-6 h-6 rounded-ds-pill bg-brand text-on-brand inline-flex items-center justify-center text-caption font-bold shrink-0">
                  1
                </b>
                <span>
                  <span className="text-ink font-bold">Create your account</span> · email and an invite code, or Google.
                </span>
              </div>
              <div className="flex items-start gap-space-10 text-body text-neutral-ink">
                <b className="w-6 h-6 rounded-ds-pill bg-brand text-on-brand inline-flex items-center justify-center text-caption font-bold shrink-0">
                  2
                </b>
                <span>
                  <span className="text-ink font-bold">Add a bank and a card</span> · upload last month&apos;s statements.
                </span>
              </div>
              <div className="flex items-start gap-space-10 text-body text-neutral-ink">
                <b className="w-6 h-6 rounded-ds-pill bg-brand text-on-brand inline-flex items-center justify-center text-caption font-bold shrink-0">
                  3
                </b>
                <span>
                  <span className="text-ink font-bold">Connect Gmail</span> · bank alerts become transactions on their own.
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default: 'signin'
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(
          'bg-accent-mint text-ink p-space-20 pb-0 desk:p-space-48 flex flex-col justify-start desk:justify-between gap-space-8 desk:gap-0 relative overflow-hidden select-none',
          className,
        )}
        {...props}
      >
        {/* Decorative tint blobs */}
        <div className="w-64 h-64 bg-positive-tint rounded-ds-pill absolute -right-20 -top-16 opacity-90 pointer-events-none" />
        <div className="w-44 h-44 bg-warning-tint rounded-ds-pill absolute -left-16 bottom-32 opacity-80 pointer-events-none" />
        <div className="w-32 h-32 bg-info-tint rounded-ds-pill absolute right-10 bottom-8 opacity-90 pointer-events-none" />

        {/* Logo mark + wordmark */}
        <div className="relative z-10">
          <Logo variant="full" />
        </div>

        {/* Signin artwork scene (shrinks on mobile) */}
        <div className="relative h-44 desk:h-72 mt-space-8 mb-0 desk:my-space-24 shrink-0 origin-center scale-90 desk:scale-100">
          {/* Credit card */}
          <div className="absolute left-4 top-10 w-52 h-32 rounded-ds-xl bg-brand text-on-brand p-space-16 shadow-level-1 flex flex-col justify-between -rotate-6">
            <div className="flex justify-between text-overline tracking-wider opacity-90 font-bold">
              <span>HDFC REGALIA GOLD</span>
              <span>₹</span>
            </div>
            <div>
              <div className="font-bold tracking-widest text-title leading-tight">
                •••• 7741
              </div>
              <div className="text-overline opacity-85 mt-space-4">
                ARJUN MEHTA · 03/29
              </div>
            </div>
          </div>

          {/* Net worth tile */}
          <div className="absolute right-4 top-2 w-52 bg-surface border border-line rounded-ds-xl shadow-level-1 p-space-12 rotate-3">
            <div className="text-caption font-semibold text-ink-3">Net worth</div>
            <div className="text-screen-title font-extrabold text-ink tracking-tight">
              ₹11.98L
            </div>
            <svg
              width="100%"
              height="36"
              viewBox="0 0 160 36"
              preserveAspectRatio="none"
              className="overflow-visible"
              aria-hidden="true"
            >
              <path
                d="M0 30 L20 26 L40 28 L60 20 L80 22 L100 14 L120 12 L140 8 L160 4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                className="text-brand"
              />
            </svg>
          </div>

          {/* Amex bill paid tile */}
          <div className="absolute left-16 bottom-4 bg-surface border border-line rounded-ds-xl shadow-level-1 px-space-14 py-space-10 flex items-center gap-space-10 -rotate-2">
            <span className="w-6 h-6 rounded-ds-pill bg-brand-tint text-brand flex items-center justify-center shrink-0">
              <Icon name="check" size="sm" />
            </span>
            <div>
              <div className="text-label font-bold text-ink">Amex bill paid</div>
              <div className="text-caption text-ink-3">₹33,900 · 2 days early</div>
            </div>
          </div>

          {/* Coin */}
          <div className="absolute right-24 bottom-10 w-12 h-12 rounded-ds-pill bg-accent-gold border-2 border-accent-gold-strong flex items-center justify-center font-extrabold text-heading text-warning-ink shadow-level-1 rotate-12">
            ₹
          </div>

          {/* Points tile */}
          <div className="absolute right-2 bottom-0 px-space-12 py-space-8 rounded-ds-xl border border-warning-border bg-warning-tint text-warning font-bold text-caption shadow-level-1 rotate-6">
            +600 pts · dining 5X
          </div>
        </div>

        {/* Copy (hides on phone) */}
        <div className="relative z-10 flex-col hidden desk:flex">
          <h1 className="text-page-title font-extrabold tracking-tight text-ink max-w-md leading-tight">
            Every rupee, every card, every loan. One calm ledger.
          </h1>
          <p className="mt-space-10 text-heading text-neutral-ink max-w-md font-medium leading-normal">
            Statements, bank alerts and brokers flow in. You see what needs you today and where the rest went.
          </p>
          <div className="mt-space-16 flex items-center gap-space-14 text-label text-ink-3 flex-wrap">
            <span>Encrypted at rest</span>
            <span>·</span>
            <span>Read-only Gmail</span>
            <span>·</span>
            <span>Your keys, your data</span>
          </div>
        </div>
      </div>
    );
  },
);

Illustration.displayName = 'Illustration';
