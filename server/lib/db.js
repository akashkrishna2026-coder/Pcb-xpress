import mongoose from 'mongoose';
import Product from '../src/models/Product.js';

export async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  if (!uri) {
    throw new Error('MONGODB_URI or MONGO_URI not set');
  }
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || process.env.MONGO_DB || undefined });
}

export async function listProducts({ q = '', limit = 100, offset = 0 } = {}) {
  const query = {};
  if (q && typeof q === 'string') {
    const rx = new RegExp(escapeRegex(q), 'i');
    query.$or = [
      { name: rx },
      { description: rx },
    ];
  }
  const [items, total] = await Promise.all([
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(Math.min(200, Math.max(0, limit)))
      .lean(),
    Product.countDocuments(query)
  ]);
  return { items, total };
}

export async function seedDefaultsIfEmpty() {
  // Skip seeding dummy products - only sync from external API
  return;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getProductById(id) {
  return Product.findById(id).lean();
}

export async function createProduct(data) {
  const doc = await Product.create(normalizeProductInput(data));
  return doc.toObject();
}

export async function updateProductById(id, data) {
  const updated = await Product.findByIdAndUpdate(id, normalizeProductInput(data), { new: true, runValidators: true }).lean();
  return updated;
}

export async function deleteProductById(id) {
  await Product.findByIdAndDelete(id);
}

export async function clearAllProducts() {
  await Product.deleteMany({});
}

export async function replaceWithSeed() {
  await clearAllProducts();
  await seedDefaultsIfEmpty();
}

function normalizeProductInput(p = {}) {
  const out = { ...p };
  // Ensure required numeric id for manual creations
  if (out.id == null) out.id = Date.now();
  if (out.price != null) out.price = Number(out.price) || 0;
  if (out.base_price != null) out.base_price = out.base_price != null ? Number(out.base_price) : null;
  if (out.gst_percent != null) out.gst_percent = Number(out.gst_percent) || 0;
  if (out.total != null) out.total = Number(out.total) || 0;
  if (out.gst != null) out.gst = Number(out.gst) || 0;
  if (out.status != null) out.status = Number(out.status) ?? 1;
  if (out.stocks != null) out.stocks = out.stocks != null ? Number(out.stocks) : null;
  if (out.min_quantity != null) out.min_quantity = out.min_quantity != null ? Number(out.min_quantity) : null;
  if (out.product_id != null) out.product_id = out.product_id != null ? Number(out.product_id) : null;
  if (out.store_id != null) out.store_id = out.store_id != null ? Number(out.store_id) : null;
  if (out.assets_id != null) out.assets_id = out.assets_id != null ? Number(out.assets_id) : null;
  if (out.id != null) out.id = Number(out.id);
  if (out.created_at) out.created_at = new Date(out.created_at);
  if (out.updated_at) out.updated_at = new Date(out.updated_at);
  if (out.products && typeof out.products === 'object') {
    if (out.products.id != null) out.products.id = Number(out.products.id);
    if (out.products.status != null) out.products.status = Number(out.products.status);
    if (out.products.created_at) out.products.created_at = new Date(out.products.created_at);
    if (out.products.updated_at) out.products.updated_at = new Date(out.products.updated_at);
  }
  if (out.stores && typeof out.stores === 'object') {
    if (out.stores.id != null) out.stores.id = Number(out.stores.id);
    if (out.stores.country_id != null) out.stores.country_id = Number(out.stores.country_id);
    if (out.stores.state_id != null) out.stores.state_id = Number(out.stores.state_id);
    if (out.stores.city_id != null) out.stores.city_id = Number(out.stores.city_id);
    if (out.stores.created_at) out.stores.created_at = new Date(out.stores.created_at);
    if (out.stores.updated_at) out.stores.updated_at = new Date(out.stores.updated_at);
    if (out.stores.deleted_at) out.stores.deleted_at = out.stores.deleted_at ? new Date(out.stores.deleted_at) : null;
  }
  return out;
}
