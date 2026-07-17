# Pixel Browser

A premium browser workspace by **PixelProTech Solutions** — browsing, productivity, AI, files, and developer tools in one installable app. Built with plain HTML, CSS, and vanilla JavaScript (no frameworks).

## What's in this folder

```
pixel-browser/
├── index.html              → the entire app (UI + logic)
├── manifest.json            → PWA config (name, icons, colors, install behavior)
├── service-worker.js        → offline caching for the app shell
└── icons/
    ├── icon-192.png          → app icon, 192×192
    ├── icon-512.png          → app icon, 512×512
    ├── icon-maskable-512.png → Android adaptive icon (safe-zone padded)
    └── apple-touch-icon.png  → iOS home-screen icon, 180×180
```

Every file above is required — the app won't install as a PWA if any are missing.

## How to publish it (GitHub Pages)

1. Create a repo (or use an existing one) and add all the files above, keeping the exact folder structure — `icons/` must stay a subfolder next to `index.html`.
2. In the repo settings, enable **GitHub Pages**, pointing at the branch/folder containing `index.html`.
3. Visit the published URL. On desktop Chrome/Edge you'll see an install icon in the address bar; on Android, Chrome will offer "Add to Home Screen" automatically; on iOS, open it in Safari and use **Share → Add to Home Screen** (Apple doesn't support the automatic install prompt).

No build step, no server-side code, no dependencies — it's fully static.

## Brand

Colors and contact details are pulled from PixelProTech Solutions' brand sheet:

| Color | Hex | Use |
|---|---|---|
| Background | `#0A0A0F` | App background |
| Purple | `#7B2FFF` | Primary accent |
| Teal | `#00D4AA` | Secondary accent |
| White | `#FFFFFF` | Text |
| Card | `#1A1A2E` | Panels/surfaces |

Contact: pixelprotechsolutions@gmail.com · 076 645 9348

## Notable behavior

- **Real browsing, with an honest limit:** the Browser tab embeds sites in an iframe. Some sites (banks, social platforms) block embedding via security headers no client-side app can override — when that happens, Pixel Browser detects it and offers **"Open in new browser tab ↗"**, which opens the real, live site outside the frame.
- **No localStorage:** all app state (notes, bookmarks, vault entries, etc.) lives in memory for the session. Wiring up persistence (localStorage, IndexedDB, or a backend) is a natural next step.
- **Themes:** 6 built-in themes, defaulting to the PixelProTech brand palette, switchable from Settings or the theme-toggle button in the top bar.

## Extending it

- Swap the in-memory AI panel replies for real calls to the Anthropic API (see `docs.claude.com` for the Messages API).
- Add persistence with IndexedDB for notes/bookmarks/vault so data survives a refresh.
- Replace the iframe-based browser with a native wrapper (e.g. Electron, Tauri, or a Chromium-based shell) if you need to browse sites that block embedding.
