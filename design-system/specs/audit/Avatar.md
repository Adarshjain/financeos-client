# Avatar: audit spec

Read `00-global.md` first. Its rules override anything below.

**Files:** `src/components/ds/Avatar/Avatar.stories.tsx`, `src/components/ds/Avatar/Avatar.tsx`

## Change (8)

- [ ] **f3db67639** · Avatar variants are FinanceOS entities
  - Now: `AvatarVariant` is `'account' | 'person' | 'logo'` (`Avatar.tsx:7`). Each is a fixed shape and colour combo named for a domain object (account, lending counterparty, bank logo).
  - Do: Use `variant: 'rounded' | 'circle' | 'square'` for shape and `tone: 'neutral' | 'brand' | 'inverse'` for fill. The app maps account to rounded+neutral, person to circle+brand, logo to square+inverse. Images still come in through `src`.
  ```tsx
  <Avatar variant="circle" tone="brand" initials="PN" />
  ```
- [ ] **f37028a66** · Avatar accepts size xl but quietly draws lg
  - Now: `AvatarSize` includes `'xl'` but `sizeStyles` has only sm/md/lg, and `Avatar.tsx:53` turns `xl` into `lg`. The public type promises a size that does not exist.
  - Do: Either remove `xl` from `AvatarSize` or add a real `xl` entry. Type `sizeStyles` as `Record<AvatarSize, string>` so the compiler keeps them in step.
- [ ] **f3de24766** · Avatar keeps the image-error flag when src changes
  - Now: `imageError` is set on failure (`Avatar.tsx:51,73`) and never reset, so a new valid `src` after a broken one still shows initials.
  - Do: Reset on change: `useEffect(() => setImageError(false), [src])`, or key the `<img>` by `src`.
- [ ] **fdca5c636** · Avatar image cannot take img attributes
  - Now: The `<img>` at `Avatar.tsx:70-75` is fixed: no `loading`, `referrerPolicy` or `crossOrigin`. A lint disable hides the Next image rule.
  - Do: Add `imgProps?: React.ImgHTMLAttributes<HTMLImageElement>` spread onto the `<img>` after the defaults, and default `loading="lazy"`.
  ```tsx
  <Avatar src={url} imgProps={{ referrerPolicy: 'no-referrer' }} />
  ```
- [ ] **fa5a2fdcd** · Avatar size control leaves out xl
  - Now: The size `options` are `['sm','md','lg']` (`Avatar.stories.tsx:20`), but `AvatarSize` has `xl`.
  - Do: Derive options from the component's size list once `xl` is fixed (see the size finding). Until then the story is right and the type is wrong.
- [ ] **f55b7456a** · Avatar story repeats hand-styled headings and frames
  - Now: Four copies of `<h3 className="... text-overline uppercase">` and a bordered frame div, plus a wrapper (`Avatar.stories.tsx:44-82`).
  - Do: Remove them with `AllVariants`. If a frame is needed, add it once as a `decorators` entry, not per block.
- [ ] **f3c06ab96** · Avatar stories depend on an Unsplash photo
  - Now: The image story uses a live Unsplash URL (`Avatar.stories.tsx:87,94,154`) with the name 'Arjun Mehta'. It needs a network and the photo can vanish.
  - Do: Use a small local image or a `data:` URI from `__fixtures__/`, and neutral sample text. Keep one `WithImage` story that takes it from `args.src`.
- [ ] **f0ec4c417** · Avatar story uses a relative import
  - Now: `Avatar.stories.tsx:4` imports `./Avatar`.
  - Do: Import from the barrel: `import { Avatar } from '@/components/ds';`.
  ```tsx
  import { Avatar } from '@/components/ds';
  ```

## Owner's own call (3)

- [ ] **fc74d56ba** · Avatar AllVariants hard-codes props
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **f5c1331aa** · Avatar Small, Large and Account repeat AllVariants
  - Do: Delete the AllVariants story; the autodocs page shows every story, with no controls on the docs page (G9).
- [ ] **fe86d3c75** · Avatar image-error fallback has no play test
  - Do: No play function and no interaction test (G9).

## Keep: do NOT change (2)

- **fdbca9f9a** · Avatar's image alt falls back to the word 'Avatar': Screen-reader-only fallback text. You have ruled out accessibility work, so no prop is needed.
- **fcbb1ef0d** · Avatar children versus initials precedence: No page needs this flexibility yet; add it when one does.

## README

Update `design-system/components/Avatar/README.md` so its Props, Variants and Built from sections describe the component **after** these changes (no other edits).
