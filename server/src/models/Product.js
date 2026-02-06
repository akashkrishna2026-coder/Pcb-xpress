import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, index: true },
    box_no: { type: String, default: null },
    product_id: { type: Number, default: null },
    store_id: { type: Number, default: null },
    assets_id: { type: Number, default: null },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    tax_type: { type: String, default: 'inclusive' },
    gst_percent: { type: Number, default: 0 },
    base_price: { type: Number, default: null },
    total: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    status: { type: Number, default: 1 },
    // AI availability/pricing metadata
    availability_hits: { type: Number, default: null },
    availability_last_checked: { type: Date, default: null },
    availability_sample_urls: { type: [String], default: [] },
    price_source: { type: String, default: 'manual' },
    invoice_name: { type: String, default: '' },
    customer_order: { type: String, default: null },
    stocks: { type: Number, default: null },
    units: { type: String, default: null },
    sub_units: { type: String, default: null },
    image_url: { type: String, default: null },
    min_quantity: { type: Number, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    products: {
      id: { type: Number, default: null },
      name: { type: String, default: '' },
      description: { type: String, default: null },
      status: { type: Number, default: 1 },
      created_at: { type: Date, default: null },
      updated_at: { type: Date, default: null },
    },
    stores: {
      id: { type: Number, default: null },
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      location: { type: String, default: '' },
      country_id: { type: Number, default: null },
      state_id: { type: Number, default: null },
      city_id: { type: Number, default: null },
      latitude: { type: String, default: '' },
      longitude: { type: String, default: '' },
      created_at: { type: Date, default: null },
      updated_at: { type: Date, default: null },
      deleted_at: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// Optional text index for searching across key fields
ProductSchema.index({ name: 'text', description: 'text' });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

export default Product;

