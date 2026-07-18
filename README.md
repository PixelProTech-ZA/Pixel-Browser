# Pixel Browser v2.0

A premium operating workspace by **PixelProTech Solutions** — browsing, projects, knowledge, assets, and developer tools in one installable app. Built with plain HTML, CSS, and vanilla JavaScript (no frameworks). Icons are a proper inline SVG set (no emoji).

## What changed in v2.0

- **Removed generic/demo content**: weather widget, focus timer, fake download simulator, demo AI chatter, preloaded example bookmarks, and the "Good morning" filler greeting are all gone. Password Vault was removed entirely rather than ship a demo-quality security feature.
- **Sidebar reorganized** into Workspace (Home, Browser, Projects, Assets, Knowledge), Browsing (Downloads, Bookmarks, Activity), Developer (Terminal, Developer Tools), AI (Pixel AI), System (Settings, Updates).
- **Home is now a command centre**: real storage/memory/network stats pulled from actual browser APIs (`navigator.storage.estimate()`, `performance.memory`, `navigator.connection`), Continue Working (from the unified Activity Log), Quick Launch, Recent Files, and Browser Health — no decorative widgets.
- **Search simplified** to Pixel / Private / Custom modes (instead of exposing 7 engines); advanced config lives in Settings.
- **Restrained color palette**: one brand accent (purple) plus semantic success/warning/danger; everything else is grayscale.
- **Notes → Knowledge Base**: markdown editor with a live preview (headings, bold/italic, code, checklists, links), pinned notes, search, and export to a real `.md` file (which logs to Downloads).
- **History → Activity Log**: a unified timeline across browsing, Knowledge, Projects, Assets, Bookmarks, and Pixel AI.
- **Files → Assets**: grid/list views, folder filters (Images/Documents/Media), drag-and-drop, inline preview.
- **Developer Tools expanded**: JSON formatter, color/gradient, UUID, Base64, regex tester, HTML preview, plus new Hash generator (SHA-1/256/384/512 via SubtleCrypto), Timestamp converter, URL encoder/decoder, JWT decoder, and a line-level Diff viewer.
- **Pixel AI** is now its own dedicated module (not a hidden side panel), with a minimal "Online" status instead of chatbot personality.
- **Downloads** only logs real, user-initiated exports from within the app (e.g. exporting a note) — no fake simulated files.
- Tap targets, empty states, and touch styling improved throughout.

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

| Color | Hex | Use |
|---|---|---|
| Background | `#0A0A0F` | App background |
| Purple | `#7B2FFF` | Primary accent (only accent color used throughout) |
| White | `#F5F4F8` | Text |
| Success / Warning / Danger | `#22C55E` / `#F59E0B` / `#EF4444` | Semantic states only |

Contact: pixelprotechsolutions@gmail.com · 076 645 9348

## Known limits (honest accounting)

- **No server**: this is a fully static app. Real browsing of sites that block iframe embedding (banks, social platforms) falls back to a genuine "Open in new browser tab" action — there's no way to force embedding without a backend proxy.
- **No persistence yet**: all state (notes, bookmarks, projects, assets, activity) lives in memory for the session, by design (no localStorage in this environment). Wiring up IndexedDB or a backend is the natural next step for session restore.
- **Pixel AI replies are a stub**: it's wired for a real conversation UI, but actual model responses need an API key/backend — see `docs.claude.com` for the Messages API.
- **Terminal is a themed command shell**, not a real system shell — split-terminal and autocomplete are on the roadmap, not yet built.
- **Diff viewer, hash generator, JWT decoder** are functional and real (no placeholders), but a CSS/JS beautifier was left out of this pass to keep the toolbox focused.

## Extending it

- Swap the Pixel AI stub for real calls to the Anthropic API.
- Add IndexedDB persistence so Projects/Assets/Knowledge survive a refresh.
- Wire Projects to actually group tabs/notes/bookmarks together (currently Projects and Quick Launch are tracked separately).

