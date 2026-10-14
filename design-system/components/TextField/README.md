# TextField

A labelled text input. Labels sit above the field in `ink-2`, 12px bold; helper or error text sits below.

## States
Default, filled, placeholder (`ink-4`), focus (2px `focus-ring`), error (`danger` border and message that says how to fix it), locked (`bg-sunken`, lock icon, no explanation needed: e.g. the account of an imported transaction).

## Rules
- Dates are typed and shown as dd/mm/yyyy.
- Amounts are right-aligned only in tables; in forms they read left to right with a ₹ prefix.
- Optional fields say "(Optional)" in the label: "MCC Code (Optional)".
- Secrets (statement passwords) are masked with a show toggle.

## Variants
- States: default, placeholder, focused, with helper, error (red border and a message that says how to fix it), disabled, locked (lock icon, no explanation).
- Kinds: amount with a ₹ prefix, password with Show, date (dd/mm/yyyy with a calendar icon), multi-line note, read-only value as a label/value row.
