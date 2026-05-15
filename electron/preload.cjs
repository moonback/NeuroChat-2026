const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose a safe API to the renderer process.
 */
contextBridge.exposeInMainWorld('neurochatElectron', {
  isElectron: true,
  fs: {
    listDir: (path) => ipcRenderer.invoke('fs:listDir', path),
    readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path, content) => ipcRenderer.invoke('fs:writeFile', path, content),
    deleteItem: (path) => ipcRenderer.invoke('fs:deleteItem', path),
    mkdir: (path) => ipcRenderer.invoke('fs:mkdir', path),
    exists: (path) => ipcRenderer.invoke('fs:exists', path),
    getStats: (path) => ipcRenderer.invoke('fs:getStats', path),
  },
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  }
});
