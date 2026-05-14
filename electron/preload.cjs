const { contextBridge } = require('electron');

/**
 * Expose a minimal, safe API to the renderer if needed later.
 * Example: contextBridge.exposeInMainWorld('electron', { platform: process.platform });
 */
contextBridge.exposeInMainWorld('neurochatElectron', {
  isElectron: true,
});
