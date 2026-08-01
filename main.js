// main.js — Electron main process.
//
// This is the piece a plain webpage can never have: a native host process
// with permission to create real, top-level Chromium views (BrowserView).
// Those views are NOT <iframe>s — they are separate browsing contexts, so
// sites that send X-Frame-Options/CSP frame-ancestors headers to block
// iframe embedding (Google, YouTube, X, etc.) still render normally here.
//
// Everything in this file exists to enforce one rule end-to-end:
//   Nothing this app opens should ever land in an external browser window
//   unless the user explicitly clicked "Open in External Browser".

const { app, BrowserWindow, BrowserView, ipcMain, session, shell } = require('electron');
const path = require('path');

const PERSIST_PARTITION = 'persist:pixel'; // shared, saved session -> logins/cookies persist like a real profile
let nextPrivatePartition = 0;

let mainWindow = null;
/** @type {Map<string, BrowserView>} */
const views = new Map();
let activeTabId = null;
let contentBounds = { x: 0, y: 0, width: 0, height: 0 };
let contentVisible = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0A0A0F',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // The chrome (top bar, sidebar, tab strip) is itself a webContents. Any
  // window.open()/target="_blank" fired from *that* UI (search-result links,
  // markdown note links, etc.) is intercepted here and redirected into a
  // normal internal Pixel tab instead of a native popup window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    mainWindow.webContents.send('tabs:request-open', { url });
    return { action: 'deny' };
  });

  mainWindow.on('resize', repositionActiveView);
  mainWindow.on('closed', () => {
    mainWindow = null;
    for (const view of views.values()) view.webContents.destroy();
    views.clear();
  });
}

function repositionActiveView() {
  if (!activeTabId || !contentVisible) return;
  const view = views.get(activeTabId);
  if (view) view.setBounds(contentBounds);
}

function sendTabUpdate(tabId, patch) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tabs:update', { tabId, ...patch });
  }
}

function normalizeUrl(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return 'about:blank';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (/^localhost(:\d+)?(\/|$)/i.test(trimmed)) return 'http://' + trimmed;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(trimmed)) return 'http://' + trimmed;
  if (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return 'https://' + trimmed; // HTTPS by default
  return 'https://duckduckgo.com/?q=' + encodeURIComponent(trimmed);
}

function createTabView(tabId, url, opts = {}) {
  const partition = opts.private ? `private:${++nextPrivatePartition}` : PERSIST_PARTITION;
  const view = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      partition, // private tabs get an in-memory session that vanishes when closed
    },
  });
  views.set(tabId, view);

  const wc = view.webContents;

  // Core rule, part two: links/popups from *inside* an embedded site (an
  // OAuth popup, a target="_blank" link on Reddit, a "login with Google"
  // window) become new internal Pixel tabs too, never a native window.
  wc.setWindowOpenHandler(({ url: popupUrl }) => {
    sendTabUpdate(tabId, {}); // no-op keep-alive; actual handling below
    mainWindow.webContents.send('tabs:request-open', { url: popupUrl, fromTabId: tabId });
    return { action: 'deny' };
  });

  wc.on('did-start-loading', () => sendTabUpdate(tabId, { loading: true }));
  wc.on('did-stop-loading', () =>
    sendTabUpdate(tabId, {
      loading: false,
      canGoBack: wc.canGoBack(),
      canGoForward: wc.canGoForward(),
    })
  );
  wc.on('page-title-updated', (_e, title) => sendTabUpdate(tabId, { title }));
  wc.on('page-favicon-updated', (_e, favicons) => sendTabUpdate(tabId, { favicon: favicons[0] || null }));
  wc.on('did-navigate', (_e, navUrl) =>
    sendTabUpdate(tabId, { url: navUrl, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() })
  );
  wc.on('did-navigate-in-page', (_e, navUrl) =>
    sendTabUpdate(tabId, { url: navUrl, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() })
  );
  wc.on('did-fail-load', (_e, code, desc, validatedURL, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // ignore aborted loads / subframe failures
    sendTabUpdate(tabId, { error: desc || 'Failed to load', url: validatedURL });
  });

  // Basic HTTPS/cert enforcement: reject invalid certs by default rather
  // than silently proceeding. A production build should route this to a
  // proper interstitial with an explicit user override + cert viewer.
  wc.on('certificate-error', (event, url, error, _certificate, callback) => {
    event.preventDefault();
    sendTabUpdate(tabId, { certError: error, url });
    callback(false);
  });

  wc.loadURL(normalizeUrl(url));
  return view;
}

/* ============ IPC: tab lifecycle ============ */

ipcMain.handle('tabs:create', (_e, { tabId, url, private: isPrivate }) => {
  createTabView(tabId, url, { private: !!isPrivate });
  return true;
});

ipcMain.handle('tabs:navigate', (_e, { tabId, url }) => {
  views.get(tabId)?.webContents.loadURL(normalizeUrl(url));
});

ipcMain.handle('tabs:back', (_e, { tabId }) => {
  const wc = views.get(tabId)?.webContents;
  if (wc?.canGoBack()) wc.goBack();
});

ipcMain.handle('tabs:forward', (_e, { tabId }) => {
  const wc = views.get(tabId)?.webContents;
  if (wc?.canGoForward()) wc.goForward();
});

ipcMain.handle('tabs:reload', (_e, { tabId }) => {
  views.get(tabId)?.webContents.reload();
});

ipcMain.handle('tabs:stop', (_e, { tabId }) => {
  views.get(tabId)?.webContents.stop();
});

// "Sleeping tabs": switching away detaches (but does not destroy) the
// BrowserView, so background tabs keep their state without repainting.
ipcMain.handle('tabs:activate', (_e, { tabId }) => {
  if (activeTabId && views.has(activeTabId) && activeTabId !== tabId && contentVisible) {
    mainWindow.removeBrowserView(views.get(activeTabId));
  }
  activeTabId = tabId;
  const view = tabId ? views.get(tabId) : null;
  if (view && contentVisible) {
    mainWindow.addBrowserView(view);
    view.setBounds(contentBounds);
  }
});

ipcMain.handle('tabs:close', (_e, { tabId }) => {
  const view = views.get(tabId);
  if (view) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.removeBrowserView(view);
    view.webContents.destroy();
    views.delete(tabId);
  }
  if (activeTabId === tabId) activeTabId = null;
});

// The renderer reports where (in window coordinates) the "Browser" panel's
// content area lives, so the native view can be stacked exactly under it.
ipcMain.handle('tabs:setBounds', (_e, bounds) => {
  contentBounds = bounds;
  repositionActiveView();
});

// Hide/show the active native view when the user switches to a non-Browser
// section (Projects, Settings, etc.) so it doesn't paint over that UI —
// BrowserViews live above the DOM regardless of which SPA section is active.
ipcMain.handle('tabs:setVisible', (_e, visible) => {
  contentVisible = visible;
  if (!activeTabId) return;
  const view = views.get(activeTabId);
  if (!view) return;
  if (visible) {
    mainWindow.addBrowserView(view);
    view.setBounds(contentBounds);
  } else {
    mainWindow.removeBrowserView(view);
  }
});

ipcMain.handle('tabs:toggleDevTools', (_e, { tabId }) => {
  const wc = views.get(tabId)?.webContents;
  if (!wc) return;
  wc.isDevToolsOpened() ? wc.closeDevTools() : wc.openDevTools({ mode: 'bottom' });
});

// The ONLY sanctioned exit from Pixel Browser: explicit, user-initiated.
ipcMain.handle('external:open', (_e, url) => shell.openExternal(url));

/* ============ Downloads ============ */

function setupDownloads() {
  session.fromPartition(PERSIST_PARTITION).on('will-download', (_event, item) => {
    const id = `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    mainWindow.webContents.send('downloads:new', {
      id,
      filename: item.getFilename(),
      url: item.getURL(),
      totalBytes: item.getTotalBytes(),
    });
    item.on('updated', (_e2, state) => {
      mainWindow.webContents.send('downloads:update', {
        id,
        state, // 'progressing' | 'interrupted'
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        paused: item.isPaused(),
      });
    });
    item.once('done', (_e2, state) => {
      mainWindow.webContents.send('downloads:done', { id, state, path: item.getSavePath() });
    });
    ipcMain.on(`downloads:pause:${id}`, () => item.canResume() !== undefined && item.pause());
    ipcMain.on(`downloads:resume:${id}`, () => item.canResume() && item.resume());
    ipcMain.on(`downloads:cancel:${id}`, () => item.cancel());
  });
}

/* ============ Permissions ============ */
// Real browsers prompt per-site; this baseline allows the common, mostly
// benign set (needed for video calls, clipboard paste, fullscreen video)
// and denies the rest. Swap for a per-origin renderer prompt for production.
function setupPermissions() {
  const allowed = new Set(['media', 'geolocation', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'pointerLock']);
  session.fromPartition(PERSIST_PARTITION).setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowed.has(permission));
  });
}

app.whenReady().then(() => {
  createWindow();
  setupDownloads();
  setupPermissions();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
