# Pixel Browser (Electron scaffold)

A real embedded-browser workspace. Every tab is a native Chromium
`BrowserView` owned by the Electron main process — not an `<iframe>` — so
sites that refuse iframe embedding (Google, YouTube, X, Facebook, etc.)
render normally.

## Run it

```bash
npm install
npm start
```

Requires Node.js 18+. First `npm install` will download Electron's Chromium
binary, so it needs network access.

## How it's wired

- **`main.js`** — the actual browser engine. Creates/positions/destroys
  `BrowserView` tabs, intercepts every popup/`window.open()` (from the app UI
  *and* from inside embedded pages) and turns it into a new internal tab,
  manages downloads, permissions, and cert-error handling. The **only** call
  to `shell.openExternal()` in the whole app is triggered by the explicit
  "Open in External Browser" button.
- **`preload.js`** — exposes a narrow `window.pixel` API to the renderer.
  `contextIsolation` stays on and `nodeIntegration` stays off, so the
  embedded web content and the app UI can't reach Node internals.
- **`index.html`** — your original UI, now driving real tabs: the
  `#browserFrame` element is left empty on purpose and just reports its
  screen position to `main.js`, which stacks the actual page on top of it.

## What's real right now

- Native tabs (open/close/switch/back/forward/reload), backed by actual
  Chromium instances, not iframes
- Every popup / `target="_blank"` / `window.open()`, from the UI or from
  inside a loaded site, becomes an internal Pixel tab
- Private tabs use a genuine ephemeral, in-memory session (real incognito,
  not just a label)
- "Sleeping tabs": switching away detaches (doesn't destroy) the view, so
  background tabs don't keep repainting
- Download manager wired to real `will-download` events (progress,
  pause/resume/cancel)
- Per-tab DevTools
- Baseline permission handling (camera/mic/notifications/clipboard/geo) and
  certificate-error rejection

## What's still a stub / next steps

These were in the spec but are genuinely separate sub-projects, not small
edits — flagging honestly rather than faking them:

- **Native PDF/Office viewers** — Chromium's built-in PDF viewer can be
  wired in via `pdfViewerEnabled` in session preferences; DOCX/XLSX/PPTX
  rendering needs a library (e.g. rendering through LibreOffice headless, or
  a JS viewer) since Chromium has no built-in support for those formats
- **Internal file manager** — needs a real filesystem-backed view (`fs`
  module in main.js) wired to its own IPC surface; currently the app's
  "Assets" panel is in-memory only
- **PWA install-to-app** — needs `session.setDisplayMediaRequestHandler` /
  manifest parsing plus a way to spin up a scoped `BrowserWindow` per
  installed app
- **Full phishing/malware detection** — would need a threat-intel API (e.g.
  Google Safe Browsing) wired into `will-navigate`; currently only basic
  cert-validity checking is enforced
- **Tab groups, workspaces, session restore, profiles** — UI-level features
  that can be layered on top of the existing tab array + `localStorage`/disk
  persistence; not yet implemented

## Security notes

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
  everywhere (main window and every tab's `BrowserView`)
- Permission allowlist in `main.js` is a *baseline*, not a real per-site
  prompt — swap `setupPermissions()` for an IPC round-trip to the renderer
  if you want the user asked per origin, like a real browser
