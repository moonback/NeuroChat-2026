const { app, BrowserWindow, session, desktopCapturer, dialog, ipcMain } = require('electron');
const path = require('path');
const { shell } = require('electron');
const fs = require('fs/promises');
const { existsSync } = require('fs');
const { ensureDb, closeDb } = require('./database.cjs');
const { registerDbIpcHandlers } = require('./dbIpcHandlers.cjs');

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
  closeDb();
});
