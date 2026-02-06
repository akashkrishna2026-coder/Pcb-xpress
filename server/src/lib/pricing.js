export function clamp(val, min = 0, max = 0) {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  if (hi > 0) return Math.max(lo, Math.min(hi, val));
  return Math.max(lo, val);
}

export function applyRounding(price, rule = 'nearest_0.99') {
  const p = Number(price) || 0;
  switch (rule) {
    case 'none':
      return Number(p.toFixed(2));
    case 'nearest_0.99': {
      const rounded = Math.round(p);
      // Adjust to .99 while preserving floor/ceil semantics sensibly
      const base = rounded >= p ? rounded : rounded + 1;
      const withCents = base - 0.01;
      return Number(withCents.toFixed(2));
    }
    default:
      return Number(p.toFixed(2));
  }
}

export function computePrice({
  basePrice,
  hits,
  allowedCount,
  rules = {},
}) {
  const {
    markupUnavailable = 0.25,
    scaleByScarcity = true,
    rounding = 'nearest_0.99',
    minPrice = 0,
    maxPrice = 0,
  } = rules || {};

  let price = Number(basePrice) || 0;
  const count = Math.max(0, Number(allowedCount) || 0);
  const h = Math.max(0, Math.min(count, Number(hits) || 0));

  if (count === 0) {
    // No vendors configured: default to markup to be conservative
    price *= 1 + markupUnavailable;
  } else if (h === 0) {
    price *= 1 + markupUnavailable;
  } else if (scaleByScarcity) {
    const scarcity = 1 - Math.max(0, Math.min(1, h / count));
    price *= 1 + markupUnavailable * scarcity;
  }

  price = clamp(price, minPrice, maxPrice);
  price = applyRounding(price, rounding);
  return Number(price.toFixed(2));
}

