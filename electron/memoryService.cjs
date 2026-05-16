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

async function indexFile(filePath, workdir) {
  try {
    const stats = await fs.stat(filePath);
    const mtime = stats.mtimeMs;
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Simple chunker: 1000 chars with 200 overlap
    const chunkSize = 1000;
    const overlap = 200;
    const chunks = [];
    for (let i = 0; i < content.length; i += (chunkSize - overlap)) {
      chunks.push(content.substring(i, i + chunkSize));
      if (i + chunkSize >= content.length) break;
    }

    const relativePath = path.relative(workdir, filePath);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const id = `${relativePath}_${i}`;
      const vector = await generateEmbedding(chunk);
      
      const vectorBuffer = Buffer.from(Float64Array.from(vector).buffer);
      getDb().prepare('INSERT OR REPLACE INTO project_vectors(id, path, content, vector, mtime, workdir) VALUES(?, ?, ?, ?, ?, ?)')
        .run(id, relativePath, chunk, vectorBuffer, mtime, workdir);
    }
    
    console.log(`[MemoryService] Indexed ${relativePath} (${chunks.length} chunks)`);
  } catch (err) {
    console.error(`[MemoryService] Failed to index ${filePath}:`, err);
  }
}

async function walkDir(dir, workdir, results = []) {
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of list) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      await walkDir(res, workdir, results);
    } else {
      const ext = path.extname(res).toLowerCase();
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html'].includes(ext)) {
        results.push(res);
      }
    }
  }
  return results;
}

function registerMemoryHandlers() {
  ipcMain.handle('memory:indexWorkdir', async (event, workdir) => {
    console.log(`[MemoryService] Starting background indexing for: ${workdir}`);
    try {
      const files = await walkDir(workdir, workdir);
      console.log(`[MemoryService] Found ${files.length} files to index`);
      
      // Index in sequence to avoid overloading (can be parallelized with p-limit if needed)
      for (const file of files) {
        await indexFile(file, workdir);
      }
      
      console.log(`[MemoryService] Indexing complete for ${workdir}`);
      return { success: true, fileCount: files.length };
    } catch (err) {
      console.error('[MemoryService] Indexing failed:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('memory:search', async (event, { query, workdir }) => {
    try {
      const queryVector = await generateEmbedding(query);
      
      // Re-use db handler logic but in Main process directly
      const db = getDb();
      const rows = db.prepare('SELECT * FROM project_vectors WHERE workdir = ?').all(workdir);
      
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
      .filter(r => r.score > 0.4)
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
