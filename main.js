const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#07080c',
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
}

ipcMain.on('window:minimize', event => BrowserWindow.fromWebContents(event.sender)?.minimize());
ipcMain.on('window:maximize', event => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('window:close', event => BrowserWindow.fromWebContents(event.sender)?.close());
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.on('open:github', () => shell.openExternal('https://github.com/JoelEngelman/Flux-Studio/releases/latest'));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});