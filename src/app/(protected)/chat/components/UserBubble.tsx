'use client';

export function UserBubble({ content }: { content?: string }) {
  return (
    <div
      className="flex justify-end pl-14"
      style={{
        animationName: 'bui-fade-up',
        animationDuration: '400ms',
        animationTimingFunction: 'var(--ease-out-strong)',
        animationFillMode: 'both',
      }}
    >
      <div className="max-w-[80%] rounded-xl bg-[var(--field)] px-3 py-1.5 text-xs leading-[1.4] text-[var(--ink)] shadow-[var(--shadow-hairline)]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
