import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  ensureDb,
  listProducts,
  seedDefaultsIfEmpty,
  getProductById,
  createProduct,
  updateProductById,
  deleteProductById,
  replaceWithSeed,
  clearAllProducts,
} from './lib/db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Ensure DB connection and seed
await ensureDb();
await seedDefaultsIfEmpty();

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Helper: Map MongoDB docs to plain objects
const mapDto = (doc) => {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return { id: String(_id), ...rest };
};

// API routes
app.get('/api/products', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = Math.min(200, Math.max(0, Number(req.query.limit) || 100));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const items = await listProducts({ q, limit, offset });
    res.json({ items: items.map(mapDto), count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const p = await getProductById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(mapDto(p));
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const created = await createProduct(req.body || {});
    res.status(201).json(mapDto(created));
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid payload' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const updated = await updateProductById(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(mapDto(updated));
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid payload' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await deleteProductById(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Utilities
app.post('/api/products/seed-defaults', async (req, res) => {
  try {
    const replace = !!(req.query.replace || req.body?.replace);
    if (replace) {
      await replaceWithSeed();
    } else {
      await seedDefaultsIfEmpty();
    }
    const items = await listProducts({});
    res.json({ items: items.map(mapDto), count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.delete('/api/products', async (req, res) => {
  try {
    await clearAllProducts();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});


// ---------- Serve React Frontend (dist/) ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from dist
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback: serve index.html for React Router support
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ---------- Start Server ----------
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`✅ Server ready at http://localhost:${PORT}`);
  console.log(`✅ API available at http://localhost:${PORT}/api`);
});
