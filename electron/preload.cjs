const { contextBridge, ipcRenderer } = require('electron');

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
  },
  db: {
    get: (key) => ipcRenderer.invoke('db:kv:get', key),
    set: (key, value) => ipcRenderer.invoke('db:kv:set', key, value),
    delete: (key) => ipcRenderer.invoke('db:kv:delete', key),
    loadVectors: (userName) => ipcRenderer.invoke('db:vectors:load', userName),
    addVector: (entry) => ipcRenderer.invoke('db:vectors:add', entry),
    saveVectors: (entries) => ipcRenderer.invoke('db:vectors:save', entries),
    clearVectors: (userName) => ipcRenderer.invoke('db:vectors:clear', userName),
    loadSessions: () => ipcRenderer.invoke('db:sessions:loadAll'),
    saveSessions: (sessions) => ipcRenderer.invoke('db:sessions:save', sessions),
    clearSessions: () => ipcRenderer.invoke('db:sessions:clear'),
    getProfile: (userName) => ipcRenderer.invoke('db:profiles:get', userName),
    setProfile: (profile) => ipcRenderer.invoke('db:profiles:update', profile),
    loadLearning: (userId) => ipcRenderer.invoke('db:learning:load', userId),
    saveLearning: (userId, encryptedData, lastUpdated) => ipcRenderer.invoke('db:learning:save', userId, encryptedData, lastUpdated),
    clearLearning: (userId) => ipcRenderer.invoke('db:learning:clear', userId),
    loadSummaries: () => ipcRenderer.invoke('db:summaries:load'),
    saveSummary: (summary) => ipcRenderer.invoke('db:summaries:save', summary),
    clearSummaries: () => ipcRenderer.invoke('db:summaries:clear'),
    saveTrace: (trace) => ipcRenderer.invoke('db:traces:save', trace),
    loadTraces: () => ipcRenderer.invoke('db:traces:load'),
    clearTraces: () => ipcRenderer.invoke('db:traces:clear'),
    migrate: (payload) => ipcRenderer.invoke('db:migrate', payload),
    project: {
      add: (entry) => ipcRenderer.invoke('db:project:add', entry),
      search: (payload) => ipcRenderer.invoke('db:project:search', payload),
      clear: (workdir) => ipcRenderer.invoke('db:project:clear', workdir),
    }
  },
  memory: {
    indexWorkdir: (workdir) => ipcRenderer.invoke('memory:indexWorkdir', workdir),
    search: (payload) => ipcRenderer.invoke('memory:search', payload),
  },
  gemini: {
    connect: (prompt) => ipcRenderer.invoke('gemini:connect', prompt),
    disconnect: () => ipcRenderer.invoke('gemini:disconnect'),
    sendAudio: (base64) => ipcRenderer.send('gemini:sendAudio', base64),
    sendVideo: (base64) => ipcRenderer.send('gemini:sendVideo', base64),
    sendText: (text) => ipcRenderer.send('gemini:sendText', text),
    sendFunctionResponse: (name, response) => ipcRenderer.send('gemini:sendFunctionResponse', { name, response }),
    analyzeStagnation: (payload) => ipcRenderer.invoke('gemini:analyzeStagnation', payload),
    onEvent: (callback) => {
      ipcRenderer.on('gemini:event', (event, data) => callback(data));
    },
    removeListener: () => {
      ipcRenderer.removeAllListeners('gemini:event');
    }
  }
});
