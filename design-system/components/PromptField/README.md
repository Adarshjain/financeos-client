# PromptField

The composer of a conversation.

## Use
- Auto-growing text area: one row to start, grows to eight rows, then scrolls.
- Enter submits the trimmed text (not while busy or disabled, not during IME composition). Shift+Enter adds a new line. The send button does the same. An uncontrolled field clears after submitting; a controlled one leaves clearing to the parent.
- The send button is off while the field is empty.
- While `busy` the button becomes stop (`onStop`).
- Desktop: text area on top, a bar row below with the hint and the button. Phone: one pill row, text then button, hint hidden.
- Floats in a dock: surface, strong line, large radius, level-1 shadow.

## Props
- `value?`, `defaultValue?`, `onValueChange?(value)`: controlled or uncontrolled text.
- `onSubmit?(value: string)`: trimmed, non-empty text.
- `onStop?()`: stop button pressed.
- `busy?: boolean`, `disabled?: boolean` (field and button off, subtle surface).
- `placeholder?: string` (default `Ask…`).
- `hint?: React.ReactNode`: caption left of the button, desktop only.
- `sendLabel?` / `stopLabel?` (defaults `Send` / `Stop`): the icon-only button's label.
- `autoFocus?: boolean`, `className?: string`. Forwards `ref` to the textarea.

## Variants
- Default, filled, multi-line, busy, disabled.

## Built from
`TextArea`, `Button` (icon-only, primary), `Icon` (`arrow-up`, `stop`).
