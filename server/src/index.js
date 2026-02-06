// server/src/index.js

// Load .env explicitly from ../.env so it works no matter the CWD (e.g., when run via PM2)
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import { connectDB } from './lib/db.js';
import { ensureUploadDir } from './lib/uploads.js';

import authRoutes from './routes/auth.js';
import quotesRoutes from './routes/quotes.js';
import settingsRoutes from './routes/settings.js';
import ordersRoutes from './routes/orders.js';
import productsRoutes from './routes/products.js';
import paymentMethodsRoutes from './routes/paymentMethods.js';
import promotionalImagesRoutes from './routes/promotionalImages.js';
import pcbSpecificationsRoutes from './routes/pcbSpecifications.js';
import threeDPrintingSpecificationsRoutes from './routes/threeDPrintingSpecifications.js';
import aiPricingRoutes from './routes/aiPricing.js';
import mfgRoutes from './routes/mfg.js';
import filmRoutes from './routes/film.js';
import financeRoutes from './routes/finance.js';
import subscriptionRoutes from './routes/subscription.js';
import salesRoutes from './routes/sales.js';

const app = express();

const PORT = Number(process.env.PORT || 4000);
const ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// --------- Static uploads (with CORS) ----------
const uploadDir = ensureUploadDir();

// /uploads
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use('/uploads', express.static(uploadDir));

// Also expose uploads under /api/uploads for reverse proxies restricted to /api/*
app.use('/api/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use('/api/uploads', express.static(uploadDir));

// --------- Health ----------
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'pcb-xpress-server', time: new Date().toISOString() });
});

// --------- API Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/promotional-images', promotionalImagesRoutes);
app.use('/api/ai-pricing', aiPricingRoutes);
app.use('/api/mfg', mfgRoutes);
app.use('/api/film', filmRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/pcb-specifications', pcbSpecificationsRoutes);
app.use('/api/3d-printing-specifications', threeDPrintingSpecificationsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/sales', salesRoutes);

// --------- Bootstrap ---------
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });
