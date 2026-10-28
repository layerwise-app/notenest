# NoteNest

<a href="https://layerwise.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://layerwise.app/powered-by-dark.png" />
    <img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="320" />
  </picture>
</a>

A Notion-style workspace: nested pages built from blocks, a `/` command menu,
and rich media. Start writing at `/notes` without an account; pages live in
the browser and sync across devices once you sign in.

## Features

- Block editor on Tiptap: text, headings, to-dos, bulleted and numbered lists,
  toggles, quotes, callouts, dividers, code with syntax highlighting, tables,
  2–4 columns, equations (KaTeX), a table of contents, and sub-pages.
- `/` menu for every block, `@` to mention a page or date, `[[` to link a
  page, `:` for emoji. Markdown shortcuts as you type (`#`, `-`, `1.`, `[]`,
  `>`, `"`, ```` ``` ````, `---`, `**bold**`, `` `code` ``, `==highlight==`), and
  pasted Markdown turns into blocks. There is no separate preview mode.
- Block handle: `+` adds a block below, ⋮⋮ drags a block or opens its menu
  (turn into, color, duplicate, move, delete). ⌘⌥0–8 turn a block into
  another type, ⌘D duplicates, ⌘⇧↑/↓ moves.
- Selection toolbar: turn into, link (⌘K, URL or page), bold, italic,
  underline, strikethrough, code, inline equation, text and background color.
- Media: images (upload, paste, drop, or link; resize, align, caption), video
  and audio (upload or link; YouTube, Vimeo, Loom, and Spotify embeds), files,
  web bookmarks with link previews, and embeds (Figma, Maps, CodePen, and more).
  Uploads need an account.
- Pages: nested tree in the sidebar with drag and drop, favorites, emoji icons,
  covers (gallery, upload, or link; reposition), backlinks, breadcrumbs,
  duplicate, move to (⌘⇧P), and Trash with restore.
- Page options: Default, Serif, or Mono font, small text, full width, lock
  page, word count, copy link, Markdown import and export, and print to PDF.
- Search (⌘K or ⌘P) across titles and text, with recent pages.
- Templates (meeting notes, daily journal, project brief, reading notes) and a
  Getting started tour.
- Light, dark, and system themes; works on phones.
- Local-first: pages are stored in IndexedDB. Signed-in users sync to D1
  (last write wins per page). Notes from the old Markdown notebook are
  converted to pages on first load, and folders become parent pages.

## Routes

- `/`: landing page
- `/notes`: opens the last visited page (`/dashboard` redirects here)
- `/notes/<pageId>`: a page
- `/sign-in`, `/sign-in/otp`, `/sign-up`, `/forgot-password`: account pages
- `/api/files/<id>`: opens an attached file (add `?download=1` to download)

## Commands

```bash
pnpm dev
pnpm test
pnpm check-types
pnpm build
pnpm auth:generate
pnpm db:generate --name <migration_name>
pnpm db:migrate
pnpm cf-typegen
pnpm release
```

`db:migrate` applies generated Drizzle migrations to the local D1 database.
Layerwise applies the same migrations to the project's production D1 database
during publishing.

## Important files

- `src/components/workspace/`: the app shell (`WorkspaceLayout.tsx`), sidebar
  and page tree, page header and top bar, search, move, and Trash
- `src/components/editor/`: the editor (`PageEditor.tsx`); `extensions.ts`
  lists every node, mark, and behavior; `nodes/`, `menus/`, `media/`
- `src/lib/pages/`: pure page helpers (tree, ordering, sync merge, validation)
- `src/lib/workspace/`: browser state (IndexedDB store, sync, page actions,
  templates, Markdown import and export)
- `src/lib/pages.functions.ts`: sync server functions
- `src/lib/files.functions.ts`: attachment upload to Layerwise Storage
- `src/lib/link-preview.functions.ts`: bookmark previews (signed-in users)
- `src/routes/api/files/$id.ts`: owner-checked redirect to a signed file URL
- `src/lib/note-files.ts`: attachment reference helpers
- `src/components/landing/`: landing page sections
- `src/lib/auth.ts`: Better Auth server configuration
- `src/db/schema.ts`: Drizzle schema (pages are rows in `synced_note`)
- `tests/`: `node --test` suites for the helpers

## Attachments

Files are stored privately in Layerwise Storage (`env.STORAGE`, bound in
`wrangler.jsonc`) under `attachments/<userId>/<fileId>`, and each upload is
recorded in the `note_file` D1 table (owner, page, key, name, size, type).
Pages never contain Storage URLs, which expire. They reference
`/api/files/<fileId>`, and that route checks the session owns the file before
redirecting to a signed URL that lasts one hour. Copy Markdown and `.md` export
turn these references into absolute links to the app. Without an account,
NoteNest shows a sign-in prompt instead of uploading. Deleting a page keeps its
files.

Keep secrets server-side. Variables prefixed with `VITE_` are included in the
browser bundle. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `AUTH_EMAIL_URL`
belong in the Worker environment.
