# Toast

A short confirmation at the bottom of the screen after an action, with Undo when the action can be reversed.

## Use
- Says what happened, with the object: "Snoozed until Wed 14 Oct", "Marked ₹20,000 paid · ₹13,900 still due", "Dashboard deleted".
- Offer **Undo** for snooze, dismiss, mark paid and other reversible actions; the row leaves at once and Undo puts it back.
- Failures use the error mark and say what is back the way it was: "Couldn't snooze. The row is back."
- One toast at a time, about 5 seconds, above the tab bar on phone.
- No icon: the words carry the result. A failure says so in its first words ("Couldn't …").

## Don't
- Don't use a toast for something the user must act on; use a Banner or the Inbox.
