const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  onModeChanged: (callback) => {
    ipcRenderer.on('mode:changed', (_event, data) => callback(data));
  },
  onRoshanTrigger: (callback) => {
    ipcRenderer.on('roshan:trigger-death', (_event, data) => callback(data));
  },
  toggleMode: () => ipcRenderer.send('mode:toggle'),
  closeApp: () => ipcRenderer.send('app:close')
});
