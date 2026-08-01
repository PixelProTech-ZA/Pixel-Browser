const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');

let win = null;
const views = new Map(); // tabId -> BrowserView
let activeTabId = null;
let liveVisible = true;

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 880,
    backgroundColor: '#0A0A0F',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile('index.html');

  // Every download that any BrowserView triggers surfaces through here,
  // regardless of which tab started it.
  session.defaultSession.on('will-download', (event, item, contents) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2);
    send('pixel:downloads:new', { id, name: item.getFilename(), url: item.getURL(), state: 'progressing' });
    item.on('updated', (e, state) => {
      send('pixel:downloads:update', {
        id, state,
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
      });
    });
    item.once('done', (e, state) => {
      send('pixel:downloads:done', { id, state, path: item.getSavePath() });
    });
  });
}

function currentView() {
  return activeTabId ? views.get(activeTabId) : null;
}

function attachViewEvents(tabId, view) {
  const wc = view.webContents;
  const push = (extra) => send('pixel:tabs:update', { tabId, ...extra });

  wc.on('did-start-loading', () => push({ loading: true }));
  wc.on('did-stop-loading', () => push({
    loading: false,
    canGoBack: wc.canGoBack(),
    canGoForward: wc.canGoForward(),
    url: wc.getURL(),
  }));
  wc.on('page-title-updated', (e, title) => push({ title }));
  wc.on('did-navigate', (e, url) => push({ url, error: null, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() }));
  wc.on('did-navigate-in-page', (e, url) => push({ url, canGoBack: wc.canGoBack(), canGoForward: wc.canGoForward() }));
  wc.on('did-fail-load', (e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = aborted (e.g. by a redirect), ignore
    push({ error: desc, loading: false });
  });

  // target="_blank", window.open(), OAuth popups, etc. — never spawn a
  // native OS window; hand the URL back to the renderer as a request to
  // open it as a normal internal Pixel tab.
  wc.setWindowOpenHandler(({ url }) => {
    send('pixel:tabs:requestOpen', { url });
    return { action: 'deny' };
  });
}

ipcMain.handle('pixel:tabs:create', (e, id, url, opts) => {
  const view = new BrowserView({
    webPreferences: {
      partition: opts && opts.private ? `private:${id}` : 'persist:pixel',
      contextIsolation: true,
    },
  });
  views.set(id, view);
  attachViewEvents(id, view);
  view.webContents.loadURL(url || 'about:blank');
});

ipcMain.handle('pixel:tabs:activate', (e, id) => {
  activeTabId = id;
  const view = id ? views.get(id) : null;
  if (!view) {
    if (win) win.setBrowserView(null);
    return;
  }
  if (win) win.setBrowserView(view);
  view.setAutoResize({ width: true, height: true });
  view.webContents.focus();
});

ipcMain.handle('pixel:tabs:close', (e, id) => {
  const view = views.get(id);
  if (view) {
    if (win && win.getBrowserView() === view) win.setBrowserView(null);
    view.webContents.destroy();
    views.delete(id);
  }
  if (activeTabId === id) activeTabId = null;
});

ipcMain.handle('pixel:tabs:back', (e, id) => { const v = views.get(id); if (v && v.webContents.canGoBack()) v.webContents.goBack(); });
ipcMain.handle('pixel:tabs:forward', (e, id) => { const v = views.get(id); if (v && v.webContents.canGoForward()) v.webContents.goForward(); });
ipcMain.handle('pixel:tabs:reload', (e, id) => { const v = views.get(id); if (v) v.webContents.reload(); });
ipcMain.handle('pixel:tabs:toggleDevTools', (e, id) => { const v = views.get(id); if (v) v.webContents.toggleDevTools(); });

ipcMain.handle('pixel:tabs:setVisible', (e, visible) => {
  liveVisible = visible;
  const view = currentView();
  if (!win || !view) return;
  if (visible) win.setBrowserView(view); else win.setBrowserView(null);
});

ipcMain.handle('pixel:tabs:setBounds', (e, rect) => {
  const view = currentView();
  if (view && liveVisible) view.setBounds({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
