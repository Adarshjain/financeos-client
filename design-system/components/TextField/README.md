# TextField

A labelled single-line input. Label above in `ink-2` 12px bold; helper or error below.

## Kinds
- Text, number, email.
- Amount: ₹ prefix, reads left to right in forms (right-aligned only in tables).
- Password: masked with a Show toggle (statement passwords).

## States
Default, filled, placeholder (`ink-4`), focus (2px `focus-ring`), error (`danger` border and a message that says how to fix it), disabled.

## Not here
- Dates: DateField. Multi-line: TextArea. A read-only value: ListField (label/value row in ListRow). No locked state: a field that can't change is disabled.
- Optional fields say "(Optional)" in the label.

## Built from
The shared field frame (label, helper, error) that TextArea, DateField and Select also use; Icon (password toggle).

## Variants
- Kinds text, amount, password; states default, placeholder, focused, with helper, error, disabled.
