import fs from 'fs';
import path from 'path';
import multer from 'multer';

export function ensureUploadDir() {
  const dir = path.resolve(process.cwd(), 'server', 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitize(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 100);
}

export function makeMulter() {
  const uploadDir = ensureUploadDir();
  const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
      const ts = Date.now();
      const base = sanitize(file.originalname);
      cb(null, `${ts}_${base}`);
    },
  });
  const limits = { fileSize: 50 * 1024 * 1024 }; // 50MB per file
  const upload = multer({ storage, limits });
  return upload;
}

export function filePublicUrl(filename) {
  // Files are served from backend /uploads endpoint
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
  // Prefer /api/uploads so reverse proxies that only forward /api/* still work
  return `${baseUrl}/api/uploads/${encodeURIComponent(filename)}`;
}
