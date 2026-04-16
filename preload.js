const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('workTimer', {
  start: (manualTime) => ipcRenderer.invoke('timer:start', { manualTime }),
  stop: () => ipcRenderer.invoke('timer:stop'),
  reset: () => ipcRenderer.invoke('timer:reset'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  resizeToContent: (height) => ipcRenderer.invoke('window:resize-to-content', { height }),
  close: () => ipcRenderer.invoke('window:close'),
  onTimerState: (callback) => {
    ipcRenderer.on('timer-state', (_event, payload) => callback(payload));
  },
});
