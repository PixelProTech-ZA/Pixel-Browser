const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pixel', {
  tabs: {
    create: (id, url, opts) => ipcRenderer.invoke('pixel:tabs:create', id, url, opts),
    activate: (id) => ipcRenderer.invoke('pixel:tabs:activate', id),
    close: (id) => ipcRenderer.invoke('pixel:tabs:close', id),
    back: (id) => ipcRenderer.invoke('pixel:tabs:back', id),
    forward: (id) => ipcRenderer.invoke('pixel:tabs:forward', id),
    reload: (id) => ipcRenderer.invoke('pixel:tabs:reload', id),
    toggleDevTools: (id) => ipcRenderer.invoke('pixel:tabs:toggleDevTools', id),
    setVisible: (visible) => ipcRenderer.invoke('pixel:tabs:setVisible', visible),
    setBounds: (rect) => ipcRenderer.invoke('pixel:tabs:setBounds', rect),
    onUpdate: (cb) => ipcRenderer.on('pixel:tabs:update', (e, data) => cb(data)),
    onRequestOpen: (cb) => ipcRenderer.on('pixel:tabs:requestOpen', (e, data) => cb(data)),
  },
  downloads: {
    onNew: (cb) => ipcRenderer.on('pixel:downloads:new', (e, data) => cb(data)),
    onUpdate: (cb) => ipcRenderer.on('pixel:downloads:update', (e, data) => cb(data)),
    onDone: (cb) => ipcRenderer.on('pixel:downloads:done', (e, data) => cb(data)),
  },
});
