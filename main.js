const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function sendUpdateStatus(status, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', { status, ...data });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
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
  mainWindow.loadFile('index.html');
}

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'));
autoUpdater.on('update-available', info => sendUpdateStatus('available', { version: info.version, releaseDate: info.releaseDate }));
autoUpdater.on('update-not-available', info => sendUpdateStatus('up-to-date', { version: info.version }));
autoUpdater.on('download-progress', progress => sendUpdateStatus('downloading', { percent: progress.percent, bytesPerSecond: progress.bytesPerSecond, transferred: progress.transferred, total: progress.total }));
autoUpdater.on('update-downloaded', info => sendUpdateStatus('downloaded', { version: info.version }));
autoUpdater.on('error', error => sendUpdateStatus('error', { message: error?.message || 'Update failed' }));

ipcMain.on('window:minimize', event => BrowserWindow.fromWebContents(event.sender)?.minimize());
ipcMain.on('window:maximize', event => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('window:close', event => BrowserWindow.fromWebContents(event.sender)?.close());
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.on('open:github', () => shell.openExternal('https://github.com/JoelEngelman/Flux-Studio/releases/latest'));
ipcMain.handle('update:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, version: result?.updateInfo?.version || app.getVersion() };
  } catch (error) {
    sendUpdateStatus('error', { message: error?.message || 'Unable to check for updates' });
    return { ok: false, message: error?.message || 'Unable to check for updates' };
  }
});
ipcMain.handle('update:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (error) {
    sendUpdateStatus('error', { message: error?.message || 'Unable to download update' });
    return { ok: false, message: error?.message || 'Unable to download update' };
  }
});
ipcMain.on('update:install', () => {
  autoUpdater.quitAndInstall(false, true);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});