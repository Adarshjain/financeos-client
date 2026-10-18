# ErrorState

What a page or section shows when its request failed (board `D-states` / `P-states`, "Error · the request failed"): what failed, one sentence, **Try again** (primary) and **Copy reference f80e0834** (secondary). The rest of the page keeps rendering. An organism because the error reference belongs to FinanceOS's error log.

## Props
- `title: ReactNode` (what failed: "Could not load transactions")
- `description?: ReactNode` ("The server answered with an error. Your data is safe; try again in a moment.")
- `action?: { label: ReactNode; onSelect: () => void }` (retries the request: `{ label: 'Try again', onSelect }`; without it there is no retry button)
- `reference?: string` (the error reference; without it there is no copy button)
- `copyLabel?: (reference) => ReactNode` (default "Copy reference <reference>")
- `onCopyReference?: (reference) => void` (called after the reference is put on the clipboard; the page may toast)
- `illustration?: ReactNode`, `size?: 'sm' | 'md'` (passed to EmptyState)

## Behaviour
- Copy writes the reference to the clipboard silently, like the app does today. If the clipboard is blocked the reference is still on screen; `onCopyReference` is still called.

## Built from
Dinero `EmptyState` (with `action` and `secondaryAction`).

## Variants
None. Retry and the reference are each optional. One working story drives it through controls.
