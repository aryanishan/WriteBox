# WriteBox

WriteBox is an offline-first rich-text notes app. Notes live in IndexedDB in the browser, so creating, editing, searching, favouriting, duplicating, exporting, and deleting notes all work without an account or network connection. Google Drive sync is optional.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The root route redirects to `/notes`.

## Features

- Tiptap editor with headings, lists, links, quotes, code blocks, and undo/redo
- Debounced local autosave and reactive IndexedDB note list
- Notes search, favorites, recent filter, duplicate, soft-delete, and storage controls
- Markdown, plain-text, and JSON exports
- Light, dark, and system themes plus local editor font-size and width preferences
- Responsive mobile sidebar and keyboard shortcuts: `Ctrl/Cmd + N`, `S`, `K`, and `Shift + S`
- Optional Google Drive sync to a dedicated `WriteBox` folder, including conflict resolution

## Google Drive setup (optional)

The app is fully usable without this configuration. To enable sync, copy `.env.example` to `.env.local`, create a Google OAuth **Web application** client, enable the Google Drive API, and set the values below:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add `http://localhost:3000` to both the OAuth client’s **Authorized JavaScript origins** and **Authorized redirect URIs**. The app uses Google’s popup code flow, for which the redirect URI is the page origin. Refresh tokens are retained only in an httpOnly cookie; browser storage holds the short-lived access token and basic connection metadata.

## Validate

```bash
npm run lint
npm run build
```

For a manual smoke test: create and edit a note, refresh the page to confirm persistence, search it with `Ctrl/Cmd + K`, export it, switch themes, and verify the mobile drawer at a narrow viewport. With Drive credentials configured, connect in Settings, sync a note, edit it, then use **Update Drive**.
