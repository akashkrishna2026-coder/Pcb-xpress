import { Router } from 'express';
import https from 'https';
import Product from '../models/Product.js';
import {
  listProducts,
  seedDefaultsIfEmpty,
  getProductById,
  createProduct,
  updateProductById,
  deleteProductById,
  replaceWithSeed,
  clearAllProducts,
} from '../../lib/db.js';

const router = Router();

const mapDto = (doc) => {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  const mongoId = String(_id);
  const externalId = rest.id;
  // Preserve both identifiers: use external numeric id for display, keep _docId for mutations
  return { _docId: mongoId, externalId, id: externalId ?? mongoId, ...rest };
};

// GET /api/products?q=&limit=&offset=
router.get('/', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = Math.min(200, Math.max(0, Number(req.query.limit) || 100));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const { items, total } = await listProducts({ q, limit, offset });
    res.json({ items: items.map(mapDto), count: total });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/products/lookup?ids=1,2,3
// Looks up products by their external numeric id field (Product.id)
router.get('/lookup', async (req, res) => {
  try {
    const raw = String(req.query.ids || '').trim();
    if (!raw) return res.json({ items: [] });
    const ids = raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (ids.length === 0) return res.json({ items: [] });

    // Query by external numeric id
    const items = await Product.find({ id: { $in: ids } }).lean();
    return res.json({ items: items.map(mapDto) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const p = await getProductById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(mapDto(p));
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const created = await createProduct(req.body || {});
    res.status(201).json(mapDto(created));
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid payload' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await updateProductById(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(mapDto(updated));
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid payload' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteProductById(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Utilities
// POST /api/products/seed-defaults?replace=1
router.post('/seed-defaults', async (req, res) => {
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

// DELETE /api/products
router.delete('/', async (_req, res) => {
  try {
    await clearAllProducts();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// POST /api/products/sync
router.post('/sync', async (req, res) => {
  try {
    console.log('Starting sync from external API...');

    let components = [];
    try {
      console.log('Fetching from external API...');
      const response = await fetch('https://api.vfleet360.com/api/get-components', {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'PCB-Xpress-Sync/1.0'
        },
        agent: new https.Agent({
          rejectUnauthorized: false  // Disable SSL verification for external API
        })
      });

      console.log('External API response status:', response.status);
      console.log('External API response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`External API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('External API raw data keys:', Object.keys(data));
      console.log('External API data type:', typeof data);
      console.log('External API data sample:', JSON.stringify(data).substring(0, 500));

      components = data?.data || data || [];
      console.log('Components extracted:', Array.isArray(components) ? components.length : 'not array');

      if (!Array.isArray(components)) {
        console.error('Invalid data format - expected array, got:', typeof components);
        throw new Error('Invalid data format from external API - expected array');
      }

    } catch (fetchError) {
      console.error('External API fetch failed:', fetchError.message);
      // Return error instead of using mock data in production
      return res.status(502).json({
        error: 'External API unavailable',
        details: fetchError.message
      });
    }

    if (components.length === 0) {
      console.log('No components to sync');
      return res.json({
        items: [],
        count: 0,
        message: 'No products to sync from external API'
      });
    }

    console.log('Clearing existing products...');
    await clearAllProducts();

    console.log('Transforming data...');
    const productsToInsert = [];
    const errors = [];

    for (let i = 0; i < components.length; i++) {
      const item = components[i];
      try {
        // Validate required fields
        if (!item || typeof item !== 'object') {
          console.warn(`Skipping invalid item at index ${i}:`, item);
          continue;
        }

        const product = {
          id: item.id || `temp_${i}`,
          box_no: item.box_no || null,
          product_id: item.product_id || null,
          store_id: item.store_id || null,
          assets_id: item.assets_id || null,
          name: item.name || `Unnamed Product ${i}`,
          description: item.description || '',
          price: parseFloat(item.price) || 0,
          base_price: item.price != null ? parseFloat(item.price) || 0 : null,
          tax_type: item.tax_type || 'inclusive',
          gst_percent: parseFloat(item.gst_percent) || 0,
          total: parseFloat(item.total) || 0,
          gst: parseFloat(item.gst) || 0,
          status: typeof item.status === 'number' ? item.status : 1,
          invoice_name: item.invoice_name || null,
          customer_order: item.customer_order || null,
          stocks: item.stocks ? parseInt(item.stocks) : null,
          units: item.units || 'pcs',
          sub_units: item.sub_units || null,
          image_url: item.image_url || null,
          min_quantity: item.min_quantity ? parseInt(item.min_quantity) : null,
          created_at: item.created_at ? new Date(item.created_at) : new Date(),
          updated_at: item.updated_at ? new Date(item.updated_at) : new Date(),
          products: item.products && typeof item.products === 'object' ? {
            id: item.products.id || null,
            name: item.products.name || 'Unknown',
            description: item.products.description || '',
            status: typeof item.products.status === 'number' ? item.products.status : 1,
            created_at: item.products.created_at ? new Date(item.products.created_at) : null,
            updated_at: item.products.updated_at ? new Date(item.products.updated_at) : null,
          } : {},
          stores: item.stores && typeof item.stores === 'object' ? {
            id: item.stores.id || null,
            name: item.stores.name || 'Unknown Store',
            address: item.stores.address || '',
            location: item.stores.location || '',
            country_id: item.stores.country_id || null,
            state_id: item.stores.state_id || null,
            city_id: item.stores.city_id || null,
            latitude: item.stores.latitude || null,
            longitude: item.stores.longitude || null,
            created_at: item.stores.created_at ? new Date(item.stores.created_at) : null,
            updated_at: item.stores.updated_at ? new Date(item.stores.updated_at) : null,
            deleted_at: item.stores.deleted_at ? new Date(item.stores.deleted_at) : null,
          } : {},
        };

        productsToInsert.push(product);
      } catch (itemError) {
        console.error(`Error processing item ${i}:`, itemError.message, item);
        errors.push(`Item ${i}: ${itemError.message}`);
      }
    }

    console.log(`Processed ${productsToInsert.length} products successfully, ${errors.length} errors`);

    if (productsToInsert.length === 0) {
      return res.status(400).json({
        error: 'No valid products to insert',
        details: errors
      });
    }

    console.log('Inserting products into database...');
    const insertResult = await Product.insertMany(productsToInsert, { ordered: false });
    console.log('Insert result:', insertResult.length);

    const { items: products } = await listProducts({});
    console.log('Final products count:', products.length);

    res.json({
      items: products.map(mapDto),
      count: products.length,
      message: `Products synced successfully. Processed: ${productsToInsert.length}, Errors: ${errors.length}`,
      details: {
        processed: productsToInsert.length,
        errors: errors.length,
        errorDetails: errors.slice(0, 10) // First 10 errors
      }
    });

  } catch (err) {
    console.error('Sync error:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({
      error: err.message || 'Server error',
      type: err.name || 'UnknownError'
    });
  }
});

export default router;

