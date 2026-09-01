'use client';

export function StreamingCaret() {
  return (
    <span
      className="inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-[var(--ink)]"
      style={{
        animation:
          'bui-fade-in 150ms ease-out both, bui-caret-blink 1s step-end infinite',
      }}
      aria-hidden="true"
    />
  );
}
