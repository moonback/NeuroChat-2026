const { ipcMain } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { getDb } = require('./database.cjs');

// Lazy load transformers
let pipeline;
async function getPipeline() {
  if (!pipeline) {
    const transformers = await import('@xenova/transformers');
    pipeline = await transformers.pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
  }
  return pipeline;
}

async function generateEmbedding(text) {
  const pipe = await getPipeline();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// ── Phase 3 Improved: Smart chunking with file-type awareness ──────────────
function chunkFile(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();

  // For code files: chunk by functions/classes/blocks
  if (['.ts', '.tsx', '.js', '.jsx', '.cjs'].includes(ext)) {
    return chunkCode(content);
  }

  // For markdown: chunk by headings
  if (ext === '.md') {
    return chunkMarkdown(content);
  }

  // Default: fixed-size chunks with overlap
  return chunkFixed(content, 800, 150);
}

function chunkCode(content) {
  const chunks = [];
  // Split by function/class boundaries (blank line between top-level declarations)
  const blocks = content.split(/\n(?=(?:export\s+)?(?:function|class|const\s+\w+\s*=\s*(?:async\s+)?(?:\(|function)))/);
  
  let current = "";
  for (const block of blocks) {
    if (current.length + block.length > 1200 && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += block + "\n";
  }
  if (current.trim()) chunks.push(current.trim());

  // If we only got 1 chunk (no function boundaries found), fall back to fixed
  if (chunks.length <= 1 && content.length > 1200) {
    return chunkFixed(content, 800, 150);
  }

  return chunks;
}

function chunkMarkdown(content) {
  const chunks = [];
  const sections = content.split(/\n(?=#{1,3}\s)/);
  
  let current = "";
  for (const section of sections) {
    if (current.length + section.length > 1200 && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += section + "\n";
  }
  if (current.trim()) chunks.push(current.trim());

  if (chunks.length <= 1 && content.length > 1200) {
    return chunkFixed(content, 800, 150);
  }

  return chunks;
}

function chunkFixed(content, chunkSize = 800, overlap = 150) {
  const chunks = [];
  for (let i = 0; i < content.length; i += (chunkSize - overlap)) {
    chunks.push(content.substring(i, i + chunkSize));
    if (i + chunkSize >= content.length) break;
  }
  return chunks;
}

// ── Phase 3 Improved: Incremental indexing via mtime ────────────────────────
async function indexFile(filePath, workdir) {
  try {
    const stats = await fs.stat(filePath);
    const mtime = stats.mtimeMs;
    // Normalize path to use forward slashes for cross-platform DB consistency
    const relativePath = path.relative(workdir, filePath).split(path.sep).join('/');
    const workdirKey = workdir.split(path.sep).join('/');
    
    // Check if file already indexed with same mtime (incremental)
    const existing = getDb().prepare(
      'SELECT mtime FROM project_vectors WHERE path = ? AND workdir = ? LIMIT 1'
    ).get(relativePath, workdirKey);
    
    if (existing && Math.abs(existing.mtime - mtime) < 1000) {
      return { skipped: true, chunks: 0 };
    }

    const content = await fs.readFile(filePath, 'utf-8');
    if (content.trim().length < 50) return { skipped: true, chunks: 0 };

    const chunks = chunkFile(content, filePath);

    getDb().prepare('DELETE FROM project_vectors WHERE path = ? AND workdir = ?')
      .run(relativePath, workdirKey);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const id = `${relativePath}_${i}`;
      const vector = await generateEmbedding(chunk);
      
      const vectorBuffer = Buffer.from(Float64Array.from(vector).buffer);
      getDb().prepare('INSERT OR REPLACE INTO project_vectors(id, path, content, vector, mtime, workdir) VALUES(?, ?, ?, ?, ?, ?)')
        .run(id, relativePath, chunk, vectorBuffer, mtime, workdirKey);
    }
    
    return { skipped: false, chunks: chunks.length };
  } catch (err) {
    console.error(`[MemoryService] Failed to index ${filePath}:`, err.message);
    return { skipped: true, chunks: 0 };
  }
}


const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', '.vscode', '.next', 
  '__pycache__', '.cache', 'coverage', '.turbo', 'build'
]);

const INDEXED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs',
  '.json', '.md', '.css', '.html', '.py', '.yaml', '.yml',
  '.toml', '.env.example', '.sql'
]);

async function walkDir(dir, workdir, results = []) {
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of list) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      await walkDir(res, workdir, results);
    } else {
      const ext = path.extname(res).toLowerCase();
      if (INDEXED_EXTENSIONS.has(ext)) {
        // Skip huge files (> 500KB)
        try {
          const stat = await fs.stat(res);
          if (stat.size < 500 * 1024) {
            results.push(res);
          }
        } catch { }
      }
    }
  }
  return results;
}

// ── Phase 3 Improved: Cleanup deleted files from index ──────────────────────
async function cleanupDeletedFiles(workdir) {
  const db = getDb();
  const workdirKey = workdir.split(path.sep).join('/');
  const indexedPaths = db.prepare(
    'SELECT DISTINCT path FROM project_vectors WHERE workdir = ?'
  ).all(workdirKey).map(r => r.path);
  
  let removed = 0;
  for (const relPath of indexedPaths) {
    const absPath = path.resolve(workdir, relPath);
    try {
      await fs.access(absPath);
    } catch {
      // File no longer exists, remove from index
      db.prepare('DELETE FROM project_vectors WHERE path = ? AND workdir = ?')
        .run(relPath, workdirKey);
      removed++;
    }
  }
  
  if (removed > 0) {
    console.log(`[MemoryService] 🧹 Cleaned ${removed} deleted files from index`);
  }
  return removed;
}

function registerMemoryHandlers() {
  ipcMain.handle('memory:indexWorkdir', async (event, workdir) => {
    console.log(`[MemoryService] Starting incremental indexing for: ${workdir}`);
    try {
      // Step 1: Cleanup deleted files
      await cleanupDeletedFiles(workdir);

      // Step 2: Walk and index (only changed files)
      const files = await walkDir(workdir, workdir);
      console.log(`[MemoryService] Found ${files.length} files to check`);
      
      let indexed = 0;
      let skipped = 0;

      for (const file of files) {
        const result = await indexFile(file, workdir);
        if (result.skipped) skipped++;
        else indexed++;
      }
      
      console.log(`[MemoryService] ✅ Indexing complete: ${indexed} updated, ${skipped} unchanged`);
      return { success: true, fileCount: indexed, skippedCount: skipped };
    } catch (err) {
      console.error('[MemoryService] Indexing failed:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('memory:search', async (event, { query, workdir }) => {
    try {
      const queryVector = await generateEmbedding(query);
      const workdirKey = workdir.split(path.sep).join('/');
      
      const db = getDb();
      const rows = db.prepare('SELECT * FROM project_vectors WHERE workdir = ?').all(workdirKey);
      
      const results = rows.map(row => {
        const vector = Array.from(new Float64Array(row.vector.buffer, row.vector.byteOffset, row.vector.byteLength / 8));
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < queryVector.length; i++) {
          dot += queryVector[i] * vector[i];
          normA += queryVector[i] * queryVector[i];
          normB += vector[i] * vector[i];
        }
        const score = dot / (Math.sqrt(normA) * Math.sqrt(normB));
        return { path: row.path, content: row.content, score };
      })
      .filter(r => r.score > 0.35) // Lowered threshold for better recall
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

      return results;
    } catch (err) {
      console.error('[MemoryService] Search failed:', err);
      return [];
    }
  });
}

module.exports = { registerMemoryHandlers };
