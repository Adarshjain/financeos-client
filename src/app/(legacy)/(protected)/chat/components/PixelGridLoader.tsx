'use client';

const PIXEL_DELAYS = [180, 360, 540, 0, 180, 360, 180, 360, 540];

export function PixelGridLoader({ className }: { className?: string }) {
  return (
    <div
      className={`grid grid-cols-[repeat(3,4px)] gap-[1.5px] ${className || ''}`}
      aria-hidden="true"
    >
      {PIXEL_DELAYS.map((delay, i) => (
        <div
          key={i}
          className="size-[4px] rounded-[1px] bg-[var(--ink)] opacity-[0.15]"
          style={{
            animationName: 'bui-pixel-on',
            animationDuration: '1400ms',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
