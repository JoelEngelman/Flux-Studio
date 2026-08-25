const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fluxStudio', {
  version: '0.1.1',
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  openLatestRelease: () => ipcRenderer.send('open:github')
});