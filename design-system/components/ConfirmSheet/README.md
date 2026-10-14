# ConfirmSheet

The confirm step before anything destructive or hard to undo: delete a transaction, statement, account, dashboard, category or rule; discard unsaved edits; delete older Gmail rows.

## Anatomy
Title names the object ("Delete Swiggy Bangalore · ₹1,249?"), one or two sentences say exactly what goes and what stays, then Cancel and the action. The action uses `btn-dd` (filled danger) and repeats the verb: "Delete statement", "Delete & save".

## Use
- When the server can tell what will be affected, show its preview first ("6 transactions it created will be deleted…") with a loading line while it checks.
- Offer the gentler option when there is one: "Close instead" on Delete account.
- Discard confirms read "Keep editing" / "Discard"; losing edits counts as destructive, so Discard is `btn-dd` too.
