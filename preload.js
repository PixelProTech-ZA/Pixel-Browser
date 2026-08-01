// preload.js — runs in an isolated world with access to Node + Electron,
// but the renderer only ever sees the narrow `window.pixel` surface below
// (contextIsolation stays on; nodeIntegration stays off in the renderer).

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pixel', {
  tabs: {
    create: (tabId, url, opts) => ipcRenderer.invoke('tabs:create', { tabId, url, ...opts }),
    navigate: (tabId, url) => ipcRenderer.invoke('tabs:navigate', { tabId, url }),
    back: (tabId) => ipcRenderer.invoke('tabs:back', { tabId }),
    forward: (tabId) => ipcRenderer.invoke('tabs:forward', { tabId }),
    reload: (tabId) => ipcRenderer.invoke('tabs:reload', { tabId }),
    stop: (tabId) => ipcRenderer.invoke('tabs:stop', { tabId }),
    activate: (tabId) => ipcRenderer.invoke('tabs:activate', { tabId }),
    close: (tabId) => ipcRenderer.invoke('tabs:close', { tabId }),
    setBounds: (bounds) => ipcRenderer.invoke('tabs:setBounds', bounds),
    setVisible: (visible) => ipcRenderer.invoke('tabs:setVisible', visible),
    toggleDevTools: (tabId) => ipcRenderer.invoke('tabs:toggleDevTools', { tabId }),
    onUpdate: (cb) => ipcRenderer.on('tabs:update', (_e, data) => cb(data)),
    onRequestOpen: (cb) => ipcRenderer.on('tabs:request-open', (_e, data) => cb(data)),
  },
  // The one deliberate, explicit escape hatch out of Pixel Browser.
  openExternal: (url) => ipcRenderer.invoke('external:open', url),
  downloads: {
    onNew: (cb) => ipcRenderer.on('downloads:new', (_e, d) => cb(d)),
    onUpdate: (cb) => ipcRenderer.on('downloads:update', (_e, d) => cb(d)),
    onDone: (cb) => ipcRenderer.on('downloads:done', (_e, d) => cb(d)),
    pause: (id) => ipcRenderer.send(`downloads:pause:${id}`),
    resume: (id) => ipcRenderer.send(`downloads:resume:${id}`),
    cancel: (id) => ipcRenderer.send(`downloads:cancel:${id}`),
  },
  platform: process.platform,
});
