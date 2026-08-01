# Pixel Browser (PWA — desktop web + mobile)

The mobile/web install target. Same `index.html` UI as the Electron desktop
app, but with no native bridge available — so live pages fall back to a
best-effort `<iframe>`. Sites that block embedding (Google, YouTube, X,
Facebook, etc.) show an "Open in new browser tab" fallback instead. That's
a real, unavoidable browser-sandbox limit on any PWA/mobile web app — only
the desktop Electron build (separate repo) has a real embedded engine that
gets around it.

## Files

- `index.html` — shared UI, same file as the desktop app
- `manifest.json` — install metadata (name, icons, theme color)
- `service-worker.js` — caches the app shell for offline install
- `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png` — **not included here**, restore them from your
  repo's git history:

  ```bash
  git checkout 615a86a -- apple-touch-icon.png icon-192.png icon-512.png icon-maskable-512.png
  ```

## Deploy

Static files — works as-is on GitHub Pages, Netlify, Vercel, or any static
host. Visitors on desktop Chrome/Edge get an install prompt; on mobile,
"Add to Home Screen."

## Relationship to the desktop app

Both targets share `index.html`. It checks for `window.pixel` at load time:
present → real Electron `BrowserView` tabs; absent (this PWA) → iframe
fallback. If you edit the UI, keep both copies of `index.html` in sync (or
symlink/build-step it from one source).
