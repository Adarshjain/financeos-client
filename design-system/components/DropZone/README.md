# DropZone

The import area. The whole zone is the target: tapping or clicking anywhere in it opens the file picker, and dropping files anywhere on it adds them, in every state, including while files are queued.

## Use
- Centred stack: icon tile, "Add statements", one line of what is accepted, and the Choose files button (a visible cue; the zone itself is the control).
- Dragging over: `brand` dashed border on `brand-tint`.
- Queued files show name, size and remove only. The user picks the account; nothing is detected or asked for at upload time.
- A file that can't be sent says why in words ("Larger than 10 MB"), not only in red.

## Props
- `title`, `hint` and `buttonLabel` are required props ("Add statements", "PDF, XLSX or XLS · up to 25 MB per upload", "Choose files"); the component has no default copy.
- Optional: `dragTitle`, `dragHint`, `isDragging`, `accept`, `multiple` (default true), `onFilesSelected`, `error`, `showDropArea` (default true), `queuedFiles`, `onRemoveFile`, `children`.

## Built from
Button, ListRow (queued files), Icon, StatusWords.

## Variants
- Idle, dragging over, queued files, a file that cannot be sent, zone-level error.
