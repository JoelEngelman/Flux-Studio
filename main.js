const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
let mainWindow;
let terminalProcess;
function sendUpdateStatus(status,data={}){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('update:status',{status,...data})}
function createWindow(){mainWindow=new BrowserWindow({width:1440,height:900,minWidth:1000,minHeight:650,backgroundColor:'#07080c',titleBarStyle:'hidden',titleBarOverlay:false,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});mainWindow.loadFile('index.html')}
autoUpdater.autoDownload=false;autoUpdater.autoInstallOnAppQuit=true;
autoUpdater.on('checking-for-update',()=>sendUpdateStatus('checking'));
autoUpdater.on('update-available',i=>sendUpdateStatus('available',{version:i.version,releaseDate:i.releaseDate}));
autoUpdater.on('update-not-available',i=>sendUpdateStatus('up-to-date',{version:i.version}));
autoUpdater.on('download-progress',p=>sendUpdateStatus('downloading',{percent:p.percent,bytesPerSecond:p.bytesPerSecond,transferred:p.transferred,total:p.total}));
autoUpdater.on('update-downloaded',i=>sendUpdateStatus('downloaded',{version:i.version}));
autoUpdater.on('error',e=>sendUpdateStatus('error',{message:e?.message||'Update failed'}));
ipcMain.on('window:minimize',e=>BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on('window:maximize',e=>{const w=BrowserWindow.fromWebContents(e.sender);if(w)w.isMaximized()?w.unmaximize():w.maximize()});
ipcMain.on('window:close',e=>BrowserWindow.fromWebContents(e.sender)?.close());
ipcMain.handle('app:version',()=>app.getVersion());
ipcMain.on('open:github',()=>shell.openExternal('https://github.com/JoelEngelman/Flux-Studio/releases/latest'));
ipcMain.handle('update:check',async()=>{try{const r=await autoUpdater.checkForUpdates();return{ok:true,version:r?.updateInfo?.version||app.getVersion()}}catch(e){sendUpdateStatus('error',{message:e?.message||'Unable to check for updates'});return{ok:false,message:e?.message||'Unable to check for updates'}}});
ipcMain.handle('update:download',async()=>{try{await autoUpdater.downloadUpdate();return{ok:true}}catch(e){sendUpdateStatus('error',{message:e?.message||'Unable to download update'});return{ok:false,message:e?.message||'Unable to download update'}}});
ipcMain.on('update:install',()=>autoUpdater.quitAndInstall(false,true));

ipcMain.handle('terminal:start',event=>{if(terminalProcess)return{ok:true};const cwd=app.getPath('home');const command=process.platform==='win32'?'powershell.exe':'/bin/bash';const args=process.platform==='win32'?['-NoLogo','-NoExit','-Command','$OutputEncoding=[Console]::OutputEncoding=[Text.UTF8Encoding]::new()']:[];terminalProcess=spawn(command,args,{cwd,windowsHide:true,shell:false});terminalProcess.stdout.on('data',d=>mainWindow?.webContents.send('terminal:data',d.toString()));terminalProcess.stderr.on('data',d=>mainWindow?.webContents.send('terminal:data',d.toString()));terminalProcess.on('close',code=>{mainWindow?.webContents.send('terminal:exit',code);terminalProcess=null});return{ok:true}});
ipcMain.on('terminal:input',(_e,data)=>{if(terminalProcess&&!terminalProcess.killed)terminalProcess.stdin.write(String(data))});
ipcMain.on('terminal:stop',()=>{if(terminalProcess){terminalProcess.kill();terminalProcess=null}});
ipcMain.handle('oauth:open',async(_e,provider)=>{const urls={Google:'https://accounts.google.com/',GitHub:'https://github.com/login',Microsoft:'https://login.microsoftonline.com/'};const url=urls[provider];if(!url)return{ok:false,message:'Unknown provider'};await shell.openExternal(url);return{ok:true,provider}});
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});
app.on('window-all-closed',()=>{if(terminalProcess)terminalProcess.kill();if(process.platform!=='darwin')app.quit()});