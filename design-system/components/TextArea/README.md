# TextArea

A labelled multi-line field for notes and descriptions.

## Use
- Same label, helper and error as TextField. Starts exactly as tall as a TextField (`control-lg`, one line) and grows a line at a time as the text wraps or new lines are added, up to 8 lines, then scrolls.
- The user can also drag the bottom-right corner to make it taller (vertical resize only).
- No character counter unless the server enforces a limit.

## Built from
The shared field frame (label, helper, error) that TextField uses.

## Variants
- Default, filled, error, disabled.
