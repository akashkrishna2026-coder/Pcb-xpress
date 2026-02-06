// Simple localStorage helpers for demo persistence

const QUOTES_KEY = 'px_quotes';
const CART_KEY = 'px_cart';
const PRODUCTS_KEY = 'px_products';

function broadcastCartChange(items) {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('px:cart-changed', { detail: { items } }));
    }
  } catch {}
}
const USER_KEY = 'px_user';
const TOKEN_KEY = 'px_token';
const ADMIN_KEY = 'px_admin';
const ADMIN_TOKEN_KEY = 'px_admin_token';
const MFG_USER_KEY = 'px_mfg_user';
const MFG_TOKEN_KEY = 'px_mfg_token';
const SALES_USER_KEY = 'px_sales_user';
const SALES_TOKEN_KEY = 'px_sales_token';

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getQuotes() {
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addQuote(entry) {
  const arr = getQuotes();
  arr.unshift(entry);
  localStorage.setItem(QUOTES_KEY, JSON.stringify(arr));
}

export function removeQuote(id) {
  const arr = getQuotes().filter((q) => q.id !== id);
  localStorage.setItem(QUOTES_KEY, JSON.stringify(arr));
}

export function clearQuotes() {
  localStorage.removeItem(QUOTES_KEY);
}

// Cart helpers
export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function setCart(items) {
  const arr = Array.isArray(items) ? items : [];
  localStorage.setItem(CART_KEY, JSON.stringify(arr));
  broadcastCartChange(arr);
}

export function addCartItem(item) {
  if (!item) return;
  const arr = getCart();
  const itemId = item.part || item.id || item.name;
  const idx = arr.findIndex((x) => (x.part || x.id || x.name) === itemId);
  if (idx >= 0) {
    const existing = arr[idx];
    arr[idx] = { ...existing, quantity: (existing.quantity || 1) + 1 };
  } else {
    // Ensure the item has a consistent identifier for cart operations
    const cartItem = { ...item, part: itemId, quantity: 1 };
    arr.unshift(cartItem);
  }
  setCart(arr);
}

export function updateCartItem(identifier, updates) {
  const arr = getCart();
  const idx = arr.findIndex((x) => (x.part || x.id || x.name) === identifier);
  if (idx >= 0) {
    arr[idx] = { ...arr[idx], ...updates };
    setCart(arr);
  }
}

export function removeCartItem(identifier) {
  const arr = getCart().filter((x) => (x.part || x.id || x.name) !== identifier);
  setCart(arr);
}

export function clearCart() {
  setCart([]);
}

// Products helpers
export function getProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function setProducts(items) {
  const arr = Array.isArray(items) ? items : [];
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(arr));
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('px:products-changed', { detail: { items: arr } }));
    }
  } catch {}
}

export function addProduct(p) {
  if (!p) return;
  const id = p.id || String(Date.now());
  const items = getProducts();
  items.unshift({ ...p, id });
  setProducts(items);
  return id;
}

export function updateProduct(id, updates) {
  const items = getProducts();
  const idx = items.findIndex((x) => (x.id || x.part) === id);
  if (idx >= 0) {
    const merged = { ...items[idx], ...updates };
    // keep id stable
    merged.id = items[idx].id || id;
    items[idx] = merged;
    setProducts(items);
  }
}

export function removeProduct(id) {
  const items = getProducts().filter((x) => (x.id || x.part) !== id);
  setProducts(items);
}

export function clearProducts() {
  localStorage.removeItem(PRODUCTS_KEY);
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('px:products-changed', { detail: { items: [] } }));
    }
  } catch {}
}

export function seedDefaultProductsIfEmpty() {
  const existing = getProducts();
  if (existing.length > 0) return existing;
  const seed = [
    {
      id: 'esp32-wroom-32',
      part: 'ESP32-WROOM-32',
      mfr: 'Espressif',
      desc: 'Wi‑Fi + BT SoC Module, dual‑core, 4MB flash',
      pkg: 'Module',
      price: 3.2,
      stock: 1200,
      img: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
      datasheet: 'https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf',
      tags: ['wifi', 'bt', 'module'],
    },
    {
      id: 'stm32f103c8t6',
      part: 'STM32F103C8T6',
      mfr: 'STMicroelectronics',
      desc: 'ARM Cortex‑M3 MCU, 72MHz, 64KB Flash, 48‑LQFP',
      pkg: 'LQFP‑48',
      price: 2.1,
      stock: 8000,
      img: 'https://images.unsplash.com/photo-1581090467986-60370534a9da',
      datasheet: 'https://www.st.com/resource/en/datasheet/cd00161566.pdf',
      tags: ['mcu', 'arm'],
    },
    {
      id: 'atmega328p-au',
      part: 'ATmega328P‑AU',
      mfr: 'Microchip',
      desc: '8‑bit AVR MCU, 32KB Flash, 20MHz, TQFP‑32',
      pkg: 'TQFP‑32',
      price: 1.8,
      stock: 5000,
      img: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952',
      datasheet: 'https://ww1.microchip.com/downloads/en/DeviceDoc/ATmega328P-Data-Sheet-DS-7810-04.pdf',
      tags: ['mcu', 'avr'],
    },
    {
      id: 'sn74hc595n',
      part: 'SN74HC595N',
      mfr: 'Texas Instruments',
      desc: '8‑bit Shift Register with Latch, DIP‑16',
      pkg: 'DIP‑16',
      price: 0.25,
      stock: 10000,
      img: 'https://images.unsplash.com/photo-1555617981-dac3880eac6a',
      datasheet: 'https://www.ti.com/lit/ds/symlink/sn74hc595.pdf',
      tags: ['logic'],
    },
    {
      id: 'ams1117-3.3',
      part: 'AMS1117‑3.3',
      mfr: 'Advanced Monolithic Systems',
      desc: 'LDO Regulator 3.3V, 1A, SOT‑223',
      pkg: 'SOT‑223',
      price: 0.12,
      stock: 20000,
      img: 'https://images.unsplash.com/photo-1610893666726-c6b3c2ac6b76',
      tags: ['regulator'],
    },
    {
      id: 'mp1584en',
      part: 'MP1584EN',
      mfr: 'Monolithic Power Systems',
      desc: '3A Step‑down Buck Converter, SOIC‑8',
      pkg: 'SOIC‑8',
      price: 0.45,
      stock: 7000,
      img: 'https://images.unsplash.com/photo-1581093588401-16c601eaee36',
      datasheet: 'https://www.monolithicpower.com/en/mp1584.html',
      tags: ['power'],
    },
    {
      id: 'bss138',
      part: 'BSS138',
      mfr: 'onsemi',
      desc: 'N‑Channel MOSFET, 50V, SOT‑23',
      pkg: 'SOT‑23',
      price: 0.07,
      stock: 32000,
      img: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb',
      tags: ['mosfet'],
    },
    {
      id: 'ws2812b',
      part: 'WS2812B',
      mfr: 'Worldsemi',
      desc: 'RGB Addressable LED, 5050',
      pkg: '5050',
      price: 0.12,
      stock: 25000,
      img: 'https://images.unsplash.com/photo-1512591290873-6d4c1f5d8bd9',
      tags: ['led'],
    },
    {
      id: 'usb-type-c-receptacle',
      part: 'USB Type‑C Receptacle',
      mfr: 'Amphenol',
      desc: 'USB‑C 16‑pin receptacle, 5Gbps',
      pkg: 'SMD',
      price: 0.35,
      stock: 9000,
      img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
      tags: ['connector'],
    },
  ];
  setProducts(seed);
  return seed;
}

// Admin helpers (demo only)
export function getAdmin() {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAdmin(admin) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearAdmin() {
  localStorage.removeItem(ADMIN_KEY);
}

export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || null;
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getMfgUser() {
  try {
    const raw = sessionStorage.getItem(MFG_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setMfgUser(operator) {
  // Use sessionStorage so manufacturing login is isolated per browser tab
  sessionStorage.setItem(MFG_USER_KEY, JSON.stringify(operator));
}

export function clearMfgUser() {
  sessionStorage.removeItem(MFG_USER_KEY);
}

export function setMfgToken(token) {
  sessionStorage.setItem(MFG_TOKEN_KEY, token);
}

export function getMfgToken() {
  return sessionStorage.getItem(MFG_TOKEN_KEY) || null;
}

export function clearMfgToken() {
  sessionStorage.removeItem(MFG_TOKEN_KEY);
}

// Sales helpers
export function getSalesUser() {
  try {
    const raw = localStorage.getItem(SALES_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSalesUser(salesUser) {
  localStorage.setItem(SALES_USER_KEY, JSON.stringify(salesUser));
}

export function clearSalesUser() {
  localStorage.removeItem(SALES_USER_KEY);
}

export function setSalesToken(token) {
  localStorage.setItem(SALES_TOKEN_KEY, token);
}

export function getSalesToken() {
  return localStorage.getItem(SALES_TOKEN_KEY) || null;
}

export function clearSalesToken() {
  localStorage.removeItem(SALES_TOKEN_KEY);
}
