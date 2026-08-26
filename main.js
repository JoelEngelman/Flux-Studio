const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');
let mainWindow;
let terminalProcess;
let pendingAuthState = null;
const AUTH_URL = 'https://fluxstudio-auth.joeldavidengelman.workers.dev';
function sendUpdateStatus(status,data={}){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('update:status',{status,...data})}
function sendAuthResult(data){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('auth:result',data)}
function handleAuthCallback(rawUrl){try{const u=new URL(rawUrl);if(u.protocol!=='fluxstudio:'||u.hostname!=='auth')return;const state=u.searchParams.get('state');const login=u.searchParams.get('login');const error=u.searchParams.get('error');if(!pendingAuthState||state!==pendingAuthState){sendAuthResult({ok:false,message:'Login verification failed. Please try again.'});return}pendingAuthState=null;if(error){sendAuthResult({ok:false,message:error});return}if(!login){sendAuthResult({ok:false,message:'GitHub did not return an account.'});return}sendAuthResult({ok:true,provider:'GitHub',login});}catch(e){sendAuthResult({ok:false,message:'Invalid authentication callback.'})}}
function createWindow(){mainWindow=new BrowserWindow({width:1440,height:900,minWidth:1000,minHeight:650,backgroundColor:'#07080c',titleBarStyle:'hidden',titleBarOverlay:false,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});mainWindow.loadFile('index.html')}
const gotLock=app.requestSingleInstanceLock();
if(!gotLock){app.quit();}else{
app.on('second-instance',(_event,commandLine)=>{const authUrl=commandLine.find(x=>x.startsWith('fluxstudio://'));if(authUrl)handleAuthCallback(authUrl);if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus()}});
app.on('open-url',(event,url)=>{event.preventDefault();handleAuthCallback(url)});
app.setAsDefaultProtocolClient('fluxstudio');
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
ipcMain.handle('terminal:start',()=>{if(terminalProcess)return{ok:true};const cwd=app.getPath('home');const command=process.platform==='win32'?'powershell.exe':'/bin/bash';const args=process.platform==='win32'?['-NoLogo','-NoExit','-Command','$OutputEncoding=[Console]::OutputEncoding=[Text.UTF8Encoding]::new()']:[];terminalProcess=spawn(command,args,{cwd,windowsHide:true,shell:false});terminalProcess.stdout.on('data',d=>mainWindow?.webContents.send('terminal:data',d.toString()));terminalProcess.stderr.on('data',d=>mainWindow?.webContents.send('terminal:data',d.toString()));terminalProcess.on('close',code=>{mainWindow?.webContents.send('terminal:exit',code);terminalProcess=null});return{ok:true}});
ipcMain.on('terminal:input',(_e,data)=>{if(terminalProcess&&!terminalProcess.killed)terminalProcess.stdin.write(String(data))});
ipcMain.on('terminal:stop',()=>{if(terminalProcess){terminalProcess.kill();terminalProcess=null}});
ipcMain.handle('oauth:open',async(_e,provider)=>{if(provider!=='GitHub')return{ok:false,message:'GitHub sign-in is currently supported'};pendingAuthState=crypto.randomBytes(24).toString('hex');await shell.openExternal(`${AUTH_URL}/auth/github?state=${encodeURIComponent(pendingAuthState)}`);return{ok:true,provider}});
app.whenReady().then(()=>{createWindow();const initialAuthUrl=process.argv.find(x=>x.startsWith('fluxstudio://'));if(initialAuthUrl)handleAuthCallback(initialAuthUrl);app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});
app.on('window-all-closed',()=>{if(terminalProcess)terminalProcess.kill();if(process.platform!=='darwin')app.quit()});
}