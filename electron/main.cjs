const { app, BrowserWindow, session, desktopCapturer, dialog, ipcMain } = require('electron');
const path = require('path');
const { shell } = require('electron');
const fs = require('fs/promises');
const { existsSync } = require('fs');
const crypto = require('crypto');
const { ensureDb, closeDb } = require('./database.cjs');
const { registerDbIpcHandlers } = require('./dbIpcHandlers.cjs');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();


const OPENROUTER_MODELS = ['deepseek/deepseek-v4-flash:free'];
const OPENROUTER_REFERER = 'https://neurochatia.vercel.app';
const OPENROUTER_TITLE = 'NeuroChat';
const MAX_OPENROUTER_MESSAGES = 40;
const MAX_OPENROUTER_CONTENT_CHARS = 24000;
const MAX_OPENROUTER_TOOLS = 64;

function getOpenRouterApiKey() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OpenRouter API key missing in main process environment');
  return apiKey;
}

function sanitizeOpenRouterMessages(messages) {
  if (!Array.isArray(messages)) throw new Error('OpenRouter messages must be an array');
  return messages.slice(-MAX_OPENROUTER_MESSAGES).map((message) => {
    const role = ['user', 'assistant', 'system'].includes(message?.role) ? message.role : null;
    if (!role || typeof message?.content !== 'string') throw new Error('Invalid OpenRouter message');
    return { role, content: message.content.slice(-MAX_OPENROUTER_CONTENT_CHARS) };
  });
}

function sanitizeOpenRouterTools(tools) {
  if (!Array.isArray(tools)) throw new Error('OpenRouter tools must be an array');
  return tools.slice(0, MAX_OPENROUTER_TOOLS).map((tool) => {
    if (typeof tool?.name !== 'string' || typeof tool?.description !== 'string' || !tool?.parameters || typeof tool.parameters !== 'object') {
      throw new Error('Invalid OpenRouter tool declaration');
    }
    return { name: tool.name, description: tool.description, parameters: tool.parameters };
  });
}

async function callOpenRouter(payload) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': OPENROUTER_REFERER,
      'X-Title': OPENROUTER_TITLE,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`OpenRouter call failed: ${msg}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0) throw new Error('OpenRouter returned empty choices');
  return data;
}

let activeGeminiSession = null;

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key missing in main process environment');
  return apiKey;
}


function hashAuditValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function pathAuditMetadata(filePath) {
  if (!filePath) return {};
  const resolved = path.resolve(String(filePath));
  return {
    pathHash: hashAuditValue(resolved),
  };
}

async function writeSecurityAudit(event) {
  try {
    const entry = {
      timestamp: Date.now(),
      ...event,
    };
    await fs.appendFile(
      path.join(app.getPath('userData'), 'security-audit.jsonl'),
      `${JSON.stringify(entry)}\n`,
      'utf-8',
    );
  } catch (error) {
    console.warn('[audit] failed to write security audit event', error);
  }
}

function auditSecurityEvent(event) {
  void writeSecurityAudit(event);
}

const MAX_READ_FILE_BYTES = 2 * 1024 * 1024;
const MAX_WRITE_FILE_BYTES = 1 * 1024 * 1024;
const EXACT_BLOCKED_MUTATION_PATHS = new Set([
  path.parse(process.cwd()).root,
  process.env.HOME,
  process.env.USERPROFILE,
].filter(Boolean).map((p) => path.resolve(p)));

const RECURSIVE_BLOCKED_MUTATION_PATHS = [
  '/etc',
  '/bin',
  '/usr',
  '/System',
  'C:\\Windows',
].filter(Boolean).map((p) => path.resolve(p));

const authorizedWorkdirs = new Set();

function assertSafePath(inputPath, operation) {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    throw new Error(`${operation}: chemin invalide`);
  }
  if (inputPath.includes('\0')) {
    throw new Error(`${operation}: chemin contenant un caractère interdit`);
  }
  if (inputPath.length > 4096) {
    throw new Error(`${operation}: chemin trop long`);
  }
  return path.resolve(inputPath);
}

function isPathInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertAuthorizedPath(inputPath, operation) {
  const resolved = assertSafePath(inputPath, operation);
  if (!Array.from(authorizedWorkdirs).some((root) => isPathInside(resolved, root))) {
    throw new Error(`${operation}: accès refusé hors dossier de travail autorisé`);
  }
  return resolved;
}

function assertMutationAllowed(inputPath, operation) {
  const resolved = assertAuthorizedPath(inputPath, operation);
  if (EXACT_BLOCKED_MUTATION_PATHS.has(resolved) || RECURSIVE_BLOCKED_MUTATION_PATHS.some((root) => isPathInside(resolved, root))) {
    throw new Error(`${operation}: mutation refusée sur un dossier système ou racine`);
  }
  return resolved;
}

function authorizeSelectedDirectories(result, options) {
  if (!result?.canceled && Array.isArray(result?.filePaths) && options?.properties?.includes('openDirectory')) {
    for (const filePath of result.filePaths) {
      const resolved = assertSafePath(filePath, 'dialog:showOpenDialog');
      authorizedWorkdirs.add(resolved);
      auditSecurityEvent({ type: 'fs.workspace_authorized', ...pathAuditMetadata(resolved) });
      console.log(`[fs] Authorized workspace: ${resolved}`);
    }
  }
  return result;
}

function assertContentSize(content) {
  if (typeof content !== 'string') {
    throw new Error('writeFile: contenu invalide');
  }
  if (Buffer.byteLength(content, 'utf-8') > MAX_WRITE_FILE_BYTES) {
    throw new Error(`writeFile: contenu trop volumineux (max ${MAX_WRITE_FILE_BYTES} octets)`);
  }
}


/**
 * Register FS and Dialog handlers
 */
function registerIpcHandlers() {
  // Directory picker
  ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    console.log('[ipc] dialog:showOpenDialog requested', options);
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win || undefined, options);
    return authorizeSelectedDirectories(result, options);
  });

  // FS: List directory
  ipcMain.handle('fs:listDir', async (event, dirPath) => {
    try {
      const safeDirPath = assertAuthorizedPath(dirPath, 'listDir');
      console.log(`[fs] Listing directory: ${safeDirPath}`);
      const entries = await fs.readdir(safeDirPath, { withFileTypes: true });
      const result = entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        size: entry.isFile() ? 0 : undefined,
      }));
      console.log(`[fs] Found ${result.length} entries`);
      auditSecurityEvent({ type: 'fs.listDir', ...pathAuditMetadata(safeDirPath), count: result.length });
      return result;
    } catch (error) {
      console.error('[electron] listDir failed', error);
      throw error;
    }
  });

  // FS: Read file
  ipcMain.handle('fs:readFile', async (event, filePath) => {
    try {
      const safeFilePath = assertAuthorizedPath(filePath, 'readFile');
      const stats = await fs.stat(safeFilePath);
      if (!stats.isFile()) throw new Error('readFile: le chemin ne pointe pas vers un fichier');
      if (stats.size > MAX_READ_FILE_BYTES) throw new Error(`readFile: fichier trop volumineux (max ${MAX_READ_FILE_BYTES} octets)`);
      console.log(`[fs] Reading file: ${safeFilePath}`);
      const content = await fs.readFile(safeFilePath, 'utf-8');
      console.log(`[fs] Read ${content.length} characters`);
      auditSecurityEvent({ type: 'fs.readFile', ...pathAuditMetadata(safeFilePath), bytes: stats.size });
      return content;
    } catch (error) {
      console.error('[electron] readFile failed', error);
      throw error;
    }
  });

  // FS: Write file
  ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
    try {
      const safeFilePath = assertMutationAllowed(filePath, 'writeFile');
      assertContentSize(content);
      await fs.writeFile(safeFilePath, content, 'utf-8');
      auditSecurityEvent({ type: 'fs.writeFile', ...pathAuditMetadata(safeFilePath), bytes: Buffer.byteLength(content, 'utf-8') });
      return true;
    } catch (error) {
      console.error('[electron] writeFile failed', error);
      throw error;
    }
  });

  // FS: Delete item
  ipcMain.handle('fs:deleteItem', async (event, itemPath) => {
    try {
      const safeItemPath = assertMutationAllowed(itemPath, 'deleteItem');
      await fs.rm(safeItemPath, { recursive: true, force: true });
      auditSecurityEvent({ type: 'fs.deleteItem', ...pathAuditMetadata(safeItemPath) });
      return true;
    } catch (error) {
      console.error('[electron] deleteItem failed', error);
      throw error;
    }
  });

  // FS: Mkdir
  ipcMain.handle('fs:mkdir', async (event, dirPath) => {
    try {
      const safeDirPath = assertMutationAllowed(dirPath, 'mkdir');
      await fs.mkdir(safeDirPath, { recursive: true });
      auditSecurityEvent({ type: 'fs.mkdir', ...pathAuditMetadata(safeDirPath) });
      return true;
    } catch (error) {
      console.error('[electron] mkdir failed', error);
      throw error;
    }
  });

  // FS: Exists
  ipcMain.handle('fs:exists', async (event, itemPath) => {
    const safeItemPath = assertAuthorizedPath(itemPath, 'exists');
    return existsSync(safeItemPath);
  });

  // FS: Stats
  ipcMain.handle('fs:getStats', async (event, itemPath) => {
    try {
      const safeItemPath = assertAuthorizedPath(itemPath, 'getStats');
      const stats = await fs.stat(safeItemPath);
      return {
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      console.error('[electron] getStats failed', error);
      throw error;
    }
  });

  ipcMain.handle('ai:openrouter:chat', async (_event, messages) => {
    let lastError;
    for (const model of OPENROUTER_MODELS) {
      try {
        const data = await callOpenRouter({
          model,
          messages: sanitizeOpenRouterMessages(messages),
          temperature: 0.7,
          max_tokens: 500,
        });
        auditSecurityEvent({ type: 'ai.openrouter.chat', model, messageCount: Array.isArray(messages) ? messages.length : 0 });
        return data.choices[0].message.content;
      } catch (error) {
        lastError = error;
        console.warn(`[OpenRouter main] ${model} failed`, error);
      }
    }
    throw lastError || new Error('All OpenRouter models failed');
  });

  ipcMain.handle('ai:openrouter:completeStepWithTools', async (_event, prompt, tools) => {
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('OpenRouter prompt must be a non-empty string');
    const data = await callOpenRouter({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt.slice(-MAX_OPENROUTER_CONTENT_CHARS) }],
      tools: sanitizeOpenRouterTools(tools).map((tool) => ({ type: 'function', function: tool })),
      tool_choice: 'auto',
    });
    const message = data.choices?.[0]?.message;
    const call = message?.tool_calls?.[0];
    if (call?.function?.name) {
      auditSecurityEvent({ type: 'ai.openrouter.tool_call', model: 'openai/gpt-4o-mini', toolName: call.function.name });
      return { name: call.function.name, arguments: call.function.arguments ?? '{}' };
    }
    auditSecurityEvent({ type: 'ai.openrouter.final_answer', model: 'openai/gpt-4o-mini' });
    return { finalAnswer: message?.content ?? '' };
  });

  // GEMINI LIVE BRIDGE
  ipcMain.handle('ai:gemini:connect', async (event, config) => {
    try {
      if (activeGeminiSession) {
        try { activeGeminiSession.close(); } catch (e) {}
        activeGeminiSession = null;
      }

      const apiKey = getGeminiApiKey();
      const genAI = new GoogleGenAI(apiKey);
      const webContents = event.sender;

      console.log('[gemini-bridge] Connecting to Gemini Live...');
      
      activeGeminiSession = await genAI.live.connect({
        model: config.model || 'gemini-3.1-flash-live-preview',
        callbacks: {
          onopen: () => {
            console.log('[gemini-bridge] Session opened');
            webContents.send('ai:gemini:onopen');
          },
          onmessage: (message) => {
            // Forward message to renderer. We might want to prune large audio data if performance is an issue,
            // but for now we send it as is (Electron IPC handles Buffers/Objects well).
            webContents.send('ai:gemini:onmessage', message);
          },
          onerror: (error) => {
            console.error('[gemini-bridge] Session error:', error);
            webContents.send('ai:gemini:onerror', error.message || 'Unknown error');
          },
          onclose: (event) => {
            console.log('[gemini-bridge] Session closed');
            webContents.send('ai:gemini:onclose', event);
            activeGeminiSession = null;
          }
        },
        config: config.config
      });

      return { success: true };
    } catch (error) {
      console.error('[gemini-bridge] Connect failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('ai:gemini:sendRealtimeInput', (event, input) => {
    if (activeGeminiSession) {
      activeGeminiSession.sendRealtimeInput(input);
    }
  });

  ipcMain.on('ai:gemini:sendClientContent', (event, content) => {
    if (activeGeminiSession) {
      activeGeminiSession.sendClientContent(content);
    }
  });

  ipcMain.on('ai:gemini:close', (event) => {
    if (activeGeminiSession) {
      try { activeGeminiSession.close(); } catch (e) {}
      activeGeminiSession = null;
    }
  });
}

/** Set by npm script `electron:dev` so the window loads the Vite dev server. */
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

const MAX_DISPLAY_SOURCES = 12;
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function openExternalUrlSafely(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (!ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      console.warn('[electron] blocked external URL with unsupported protocol', parsed.protocol);
      return;
    }
    shell.openExternal(parsed.toString()).catch((error) => {
      console.error('[electron] openExternal failed', error);
    });
  } catch (error) {
    console.warn('[electron] blocked invalid external URL', rawUrl, error);
  }
}

/**
 * Sans ce gestionnaire, getDisplayMedia() échoue souvent avec NotSupportedError
 * dans le renderer Electron (sandbox / pas de picker Chromium intégré).
 */
function registerDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        fetchWindowIcons: false,
      });
      if (!sources.length) {
        callback({});
        return;
      }

      const trimmed = sources.slice(0, MAX_DISPLAY_SOURCES);
      const labels = trimmed.map((s) => {
        const n = s.name || 'Source';
        return n.length > 72 ? `${n.slice(0, 69)}…` : n;
      });
      const cancelIndex = labels.length;

      const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      const { response } = await dialog.showMessageBox(parent || undefined, {
        type: 'question',
        buttons: [...labels, 'Annuler'],
        defaultId: 0,
        cancelId: cancelIndex,
        title: 'NeuroChat — Partage d’écran',
        message:
          'Choisis l’écran ou la fenêtre à envoyer à l’assistant.\n\n' +
          (sources.length > MAX_DISPLAY_SOURCES
            ? `(Liste limitée aux ${MAX_DISPLAY_SOURCES} premières sources.)`
            : ''),
      });

      if (response === cancelIndex) {
        callback({});
        return;
      }
      callback({ video: trimmed[response] });
    } catch (e) {
      console.error('[electron] setDisplayMediaRequestHandler', e);
      callback({});
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
    show: false,
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrlSafely(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const currentUrl = win.webContents.getURL();
    if (currentUrl && url !== currentUrl) {
      event.preventDefault();
      openExternalUrlSafely(url);
    }
  });

  if (devServerUrl) {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  if (process.env.NEUROCHAT_ALLOW_UNSAFE_FRAME_HEADER_STRIPPING === 'true') {
    console.warn('[electron] UNSAFE: stripping frame/CSP headers is enabled by environment flag');
    session.defaultSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };

      Object.keys(responseHeaders).forEach(key => {
        const lower = key.toLowerCase();
        if (lower === 'x-frame-options' || lower === 'content-security-policy') {
          delete responseHeaders[key];
        }
      });

      callback({ cancel: false, responseHeaders });
    });
  }

  registerDisplayMediaHandler();
  ensureDb(app);
  registerIpcHandlers();
  registerDbIpcHandlers();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (activeGeminiSession) {
    try { activeGeminiSession.close(); } catch (e) {}
  }
  closeDb();
});
