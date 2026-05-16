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
  ai: {
    chatWithOpenRouter: (messages) => ipcRenderer.invoke('ai:openrouter:chat', messages),
    completeOpenRouterStepWithTools: (prompt, tools) => ipcRenderer.invoke('ai:openrouter:completeStepWithTools', prompt, tools),
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
  },
  ai: {
    gemini: {
      connect: (config) => ipcRenderer.invoke('ai:gemini:connect', config),
      sendRealtimeInput: (input) => ipcRenderer.send('ai:gemini:sendRealtimeInput', input),
      sendClientContent: (content) => ipcRenderer.send('ai:gemini:sendClientContent', content),
      close: () => ipcRenderer.send('ai:gemini:close'),
      onopen: (callback) => ipcRenderer.on('ai:gemini:onopen', () => callback()),
      onmessage: (callback) => ipcRenderer.on('ai:gemini:onmessage', (_event, message) => callback(message)),
      onerror: (callback) => ipcRenderer.on('ai:gemini:onerror', (_event, error) => callback(error)),
      onclose: (callback) => ipcRenderer.on('ai:gemini:onclose', (_event, event) => callback(event)),
      removeAllListeners: () => {
        ipcRenderer.removeAllListeners('ai:gemini:onopen');
        ipcRenderer.removeAllListeners('ai:gemini:onmessage');
        ipcRenderer.removeAllListeners('ai:gemini:onerror');
        ipcRenderer.removeAllListeners('ai:gemini:onclose');
      }
    }
  }
});
