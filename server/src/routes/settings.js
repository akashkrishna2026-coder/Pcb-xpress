import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Setting from '../models/Setting.js';

const router = Router();

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const decoded = jwt.verify(parts[1], process.env.JWT_SECRET || 'dev_secret');
      if (decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
    } catch (_) {}
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str || ''));
}

// GET /api/settings/smtp
router.get('/smtp', requireAdmin, async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'smtp' });
    if (!doc) return res.json({ smtp: null });
    const val = doc.value || {};
    const safe = { ...val };
    if (safe.password) safe.hasPassword = true;
    delete safe.password;
    res.json({ smtp: safe, updatedAt: doc.updatedAt });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings/smtp
router.put('/smtp', requireAdmin, async (req, res) => {
  try {
    const { host, port, secure, user, password, fromName, fromEmail } = req.body || {};
    const errors = [];
    if (!host || typeof host !== 'string') errors.push({ field: 'host', message: 'Host is required' });
    const p = Number(port);
    if (!Number.isFinite(p) || p < 1 || p > 65535) errors.push({ field: 'port', message: 'Invalid port' });
    const sec = Boolean(secure);
    if (!user || typeof user !== 'string') errors.push({ field: 'user', message: 'User is required' });
    if (fromEmail && !isEmail(fromEmail)) errors.push({ field: 'fromEmail', message: 'Invalid from email' });
    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

    const existing = await Setting.findOne({ key: 'smtp' });
    const nextVal = {
      host: String(host),
      port: p,
      secure: sec,
      user: String(user),
      fromName: fromName ? String(fromName) : '',
      fromEmail: fromEmail ? String(fromEmail) : '',
    };
    if (password && typeof password === 'string') nextVal.password = password;
    else if (existing && existing.value?.password) nextVal.password = existing.value.password; // keep previous

    const doc = existing
      ? Object.assign(existing, { value: nextVal, updatedBy: req.user.sub })
      : new Setting({ key: 'smtp', value: nextVal, updatedBy: req.user.sub });
    await doc.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/settings/factory-video (admin)
router.get('/factory-video', requireAdmin, async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'factory-video' });
    if (!doc) return res.json({ value: 'https://www.youtube.com/embed/7YcW25PHnAA' }); // default
    res.json({ value: doc.value || 'https://www.youtube.com/embed/7YcW25PHnAA', updatedAt: doc.updatedAt });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/settings/factory-video-public (no auth) — used by Capabilities page
router.get('/factory-video-public', async (_req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'factory-video' });
    if (!doc) return res.json({ value: 'https://www.youtube.com/embed/7YcW25PHnAA' });
    return res.json({ value: doc.value || 'https://www.youtube.com/embed/7YcW25PHnAA' });
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings/factory-video
router.put('/factory-video', requireAdmin, async (req, res) => {
  try {
    const { value } = req.body || {};
    if (!value || typeof value !== 'string') {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Basic URL validation
    if (!value.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Normalize common YouTube forms to /embed/ to avoid X-Frame-Options issues
    const toEmbedUrl = (url = '') => {
      try {
        const s = String(url || '').trim();
        if (!s) return s;
        const yb = s.match(/^https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{6,})/);
        if (yb) return `https://www.youtube.com/embed/${yb[1]}`;
        const u = new URL(s);
        if (u.hostname.includes('youtube.com')) {
          const id = u.searchParams.get('v');
          if (id) return `https://www.youtube.com/embed/${id}`;
          if (u.pathname.startsWith('/embed/')) return s;
        }
        return s;
      } catch {
        return url;
      }
    };

    const normalized = toEmbedUrl(value);

    const existing = await Setting.findOne({ key: 'factory-video' });
    const doc = existing
      ? Object.assign(existing, { value: String(normalized), updatedBy: req.user.sub })
      : new Setting({ key: 'factory-video', value: String(normalized), updatedBy: req.user.sub });
    await doc.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/settings/maintenance-mode (admin)
router.get('/maintenance-mode', requireAdmin, async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'maintenance-mode' });
    if (!doc) return res.json({ enabled: false, message: 'Site is currently under maintenance. Please check back later.' });
    res.json({ enabled: doc.value?.enabled || false, message: doc.value?.message || 'Site is currently under maintenance. Please check back later.', updatedAt: doc.updatedAt });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/settings/maintenance-mode-public (no auth) — used by public pages
router.get('/maintenance-mode-public', async (_req, res) => {
  try {
    const doc = await Setting.findOne({ key: 'maintenance-mode' });
    if (!doc) return res.json({ enabled: false, message: 'Site is currently under maintenance. Please check back later.' });
    return res.json({ enabled: doc.value?.enabled || false, message: doc.value?.message || 'Site is currently under maintenance. Please check back later.' });
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings/maintenance-mode
router.put('/maintenance-mode', requireAdmin, async (req, res) => {
  try {
    const { enabled, message } = req.body || {};
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled must be a boolean' });
    }
    if (message && typeof message !== 'string') {
      return res.status(400).json({ error: 'Message must be a string' });
    }

    const value = {
      enabled: Boolean(enabled),
      message: message || 'Site is currently under maintenance. Please check back later.'
    };

    const existing = await Setting.findOne({ key: 'maintenance-mode' });
    const doc = existing
      ? Object.assign(existing, { value, updatedBy: req.user.sub })
      : new Setting({ key: 'maintenance-mode', value, updatedBy: req.user.sub });
    await doc.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
