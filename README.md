# NoteNest

<a href="https://layerwise.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://layerwise.app/powered-by-dark.png" />
    <img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="320" />
  </picture>
</a>

A calm Markdown notebook. Start writing at `/notes` without an account; notes
live in the browser and sync across devices once you sign in.

## Features

- Three-pane notebook: sidebar, note list, editor. Stacked navigation on phones.
- Markdown editor with live syntax highlighting, a formatting toolbar, and
  shortcuts (⌘B, ⌘I, ⌥⌘1–3, lists, checklists, quotes, code, links).
- Edit, split, and preview modes (⌘/), plus focus mode (⌘⇧F).
- `#tags` parsed from note text, with counts and filtering in the sidebar.
- Checklists you can tick in preview; progress shows in the note list.
- `[[Wiki links]]` with autocomplete, create-on-click, and backlinks.
- Command palette (⌘K) for notes, actions, views, and folders.
- Note info: word count, reading time, outline, created and edited dates.
- Export as `.md`, copy Markdown, or print to PDF.
- Templates (meeting notes, daily journal, project brief) and a Today note.
- Folders, pinning, search, sorting, and Recently deleted with restore.
- Local autosave; signed-in sync to D1 through `src/lib/notes.functions.ts`.

## Routes

- `/`: landing page
- `/notes`: the notebook (`/dashboard` redirects here)
- `/sign-in`, `/sign-in/otp`, `/sign-up`, `/forgot-password`: account pages

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

- `src/components/notes/`: notebook UI (`NotesApp.tsx` is the entry point)
- `src/components/landing/`: landing page sections
- `src/hooks/use-notebook.ts`: local storage, merge, and sync
- `src/lib/`: pure note helpers (tags, links, Markdown, templates, sorting)
- `src/lib/notes.functions.ts`: sync server functions and input validation
- `src/lib/auth.ts`: Better Auth server configuration
- `src/db/schema.ts`: Drizzle schema
- `tests/`: `node --test` suites for the helpers

Keep secrets server-side. Variables prefixed with `VITE_` are included in the
browser bundle. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `AUTH_EMAIL_URL`
belong in the Worker environment.
