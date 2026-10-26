# MessageBubble

A sent message in a conversation.

## Use
- Aligned to the end of its column. Width fits the text; a left padding step keeps it from spanning the whole column.
- Brand-tint background, large radius with a small bottom-right corner.
- Server component: no hooks, no `'use client'`.

## Props
- `children: React.ReactNode`: the message text.
- `meta?: React.ReactNode`: caption under the bubble, right-aligned (for example a time).
- `className?: string` and standard `<div>` attributes; forwards `ref`.

## Variants
- Default, with meta, long message.

## Built from
`Text` (the meta caption).
