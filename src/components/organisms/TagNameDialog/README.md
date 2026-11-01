# TagNameDialog

A small Dinero Dialog with one Name field: it names a new tag (Tags page) or renames one (Tags page, and Manage in the TagSheet). Bottom sheet on phone, dialog on desktop.

## Props
- `open`, `onOpenChange`: the Dialog's.
- `title`: "New tag" or "Rename tag".
- `initialName?`: the name the field starts with each time it opens.
- `submitLabel`: the primary action ("Add tag", "Save name"); disabled while the name is empty.
- `onSubmit?(name)`: the trimmed name was confirmed (button or Enter).
- `loading?`, `error?`: saving state and a server message under the field.

## Built from
Dialog, TextField.

## Variants
New tag · Rename tag (the stories).
