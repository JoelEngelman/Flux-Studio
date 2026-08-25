const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('fluxStudio',{version:'0.1.0'});