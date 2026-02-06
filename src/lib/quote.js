// Pricing-based estimator for PCB manufacturing (INR) using provided brackets
// Applies 18% GST on both material and setup costs. Rate is per sq cm.

const pricingDB = {
  'Single Layer': [
    { max: 50, rate: 50, unit: 'paisa', setup: { standard: 5000, express: 7000 } },
    { max: 100, rate: 45, unit: 'paisa', setup: { standard: 2500, express: 3500 } },
    { max: 250, rate: 40, unit: 'paisa', setup: { standard: 2500, express: 3500 } },
    { max: 500, rate: 40, unit: 'paisa', setup: { standard: 2000, express: 3000 } },
    { max: 1000, rate: 40, unit: 'paisa', setup: { standard: 2000, express: 3000 } },
    { max: 5000, rate: 40, unit: 'paisa', setup: { standard: 2000, express: 3000 } },
    { max: 999999, rate: 35, unit: 'paisa', setup: { standard: 2000, express: 3000 } },
  ],
  'Double Layer': [
    { max: 50, rate: 95, unit: 'paisa', setup: { standard: 10000, express: 15000 } },
    { max: 100, rate: 90, unit: 'paisa', setup: { standard: 5000, express: 10000 } },
    { max: 250, rate: 80, unit: 'paisa', setup: { standard: 5000, express: 7500 } },
    { max: 500, rate: 80, unit: 'paisa', setup: { standard: 4000, express: 5000 } },
    { max: 1000, rate: 80, unit: 'paisa', setup: { standard: 4000, express: 5000 } },
    { max: 5000, rate: 80, unit: 'paisa', setup: { standard: 4000, express: 5000 } },
    { max: 999999, rate: 70, unit: 'paisa', setup: { standard: 4000, express: 5000 } },
  ],
  'Multi Layer': [
    { max: 50, rate: 5, unit: 'rupee', setup: { standard: 30000, express: 30000 } },
    { max: 100, rate: 5, unit: 'rupee', setup: { standard: 30000, express: 30000 } },
    { max: 250, rate: 4, unit: 'rupee', setup: { standard: 30000, express: 30000 } },
    { max: 500, rate: 3.5, unit: 'rupee', setup: { standard: 30000, express: 30000 } },
    { max: 1000, rate: 3.5, unit: 'rupee', setup: { standard: 30000, express: 30000 } },
    { max: 5000, rate: 3.5, unit: 'rupee', setup: { standard: 30000, express: 30000 } },
    { max: 999999, rate: 3.5, unit: 'rupee', setup: { standard: 30000, express: 30000 } },
  ],
};

export function estimateQuote({ specs, delivery } = {}) {
  const {
    widthMm = 100,
    heightMm = 100,
    layers = 2,
    quantity = 1,
    delivery: specsDelivery,
  } = specs || {};

  // Resolve delivery mode: accept string or object with { speed }
  let deliveryRaw = delivery ?? specsDelivery ?? (typeof specs?.delivery === 'object' ? specs?.delivery?.speed : specs?.delivery);
  if (deliveryRaw && typeof deliveryRaw === 'object') {
    deliveryRaw = deliveryRaw.speed;
  }
  const deliveryMode = String(deliveryRaw).toLowerCase() === 'express' ? 'express' : 'standard';

  // Determine layer type
  const layerType = layers <= 1 ? 'Single Layer' : layers === 2 ? 'Double Layer' : 'Multi Layer';
  const brackets = pricingDB[layerType];
  const qty = Math.max(1, Number(quantity) || 1);

  // Find pricing bracket: first where qty <= max
  const bracket = brackets.find((b) => qty <= b.max) || brackets[brackets.length - 1];
  if (!bracket) {
    return { currency: 'INR', breakdown: { error: 'No bracket for quantity' }, total: 0 };
  }

  // Geometry
  const areaPerBoardCm2 = (Number(widthMm) * Number(heightMm)) / 100; // mm^2 -> cm^2
  const totalAreaCm2 = areaPerBoardCm2 * qty;

  // Rate per sq cm in INR (convert paisa to rupees when needed)
  let ratePerSqCm = Number(bracket.rate) || 0;
  if (bracket.unit === 'paisa') {
    ratePerSqCm = ratePerSqCm / 100; // convert to rupees
  }

  // Base costs
  const materialBase = totalAreaCm2 * ratePerSqCm;
  const setupBase = Number(bracket.setup?.[deliveryMode]) || 0;

  // Taxes on subtotal (material + setup)
  const GST = 0.18;
  const subTotal = materialBase + setupBase;
  const gstAmount = subTotal * GST;
  const total = round(subTotal + gstAmount);

  return {
    currency: 'INR',
    breakdown: {
      layerType,
      deliveryMode: deliveryMode.toUpperCase(),
      quantity: qty,
      areaPerBoardCm2: round(areaPerBoardCm2),
      totalAreaCm2: round(totalAreaCm2),
      rateUsed: `${bracket.rate} ${bracket.unit}`,
      materialBase: round(materialBase),
      setupBase: round(setupBase),
      subTotal: round(subTotal),
      gstAmount: round(gstAmount),
    },
    total,
  };
}

export function round(n) {
  return Math.round(Number(n) * 100) / 100;
}

// 3D printing quote estimator (approximate). Adjust for your pricing model.
export function estimate3DQuote({ specs3d, delivery }) {
  const {
    tech = 'fdm', // fdm|sla|sls
    material = 'PLA',
    dims = { xMm: 50, yMm: 50, zMm: 30 },
    resolution = 'standard', // draft|standard|high
    infillPercent = 20,
    quantity = 1,
    finishing = 'raw', // raw|sanded|painted
  } = specs3d || {};

  const volCm3Approx = (Number(dims.xMm) * Number(dims.yMm) * Number(dims.zMm)) / 1000; // mm^3 -> cm^3 (overshoots solid volume)
  const effectiveFill = Math.min(100, Math.max(0, Number(infillPercent))) / 100;
  const solidFactor = tech === 'sls' ? 0.9 : 0.35; // shells and top/bottom layers add to volume
  const estMaterialCm3 = volCm3Approx * (solidFactor * effectiveFill + 0.1);

  const baseRate = { fdm: 0.12, sla: 0.35, sls: 0.28 }[tech] || 0.2; // USD/cm^3
  const materialFactor = {
    PLA: 1.0,
    ABS: 1.1,
    PETG: 1.15,
    Resin: 1.3,
    Nylon: 1.4,
  }[material] || 1.0;
  const resFactor = { draft: 0.85, standard: 1.0, high: 1.25 }[resolution] || 1.0;

  const printCost = estMaterialCm3 * baseRate * materialFactor * resFactor * quantity;

  const setupFee = 8; // prep, slicing
  const finishingAdders = { raw: 0, sanded: 6, painted: 15 };
  const finishingCost = (finishingAdders[finishing] || 0) * quantity;

  const speed = delivery?.speed || 'standard';
  const expediteFactor = speed === 'express' ? 1.15 : 1.0;
  const shipping = speed === 'express' ? 25 : 12;

  const subtotal = setupFee + printCost + finishingCost;
  const expeditedSubtotal = subtotal * expediteFactor;
  const tax = 0;
  const total = expeditedSubtotal + tax + shipping;

  return {
    currency: 'INR',
    breakdown: {
      setupFee: toINR(setupFee),
      printCost: toINR(printCost),
      finishing: toINR(finishingCost),
      shipping: toINR(shipping),
      tax: toINR(tax),
      expediteFactor,
      estCm3: round(estMaterialCm3),
      qty: Number(quantity) || 1,
      tech,
      material,
      resolution,
      infillPercent: Number(infillPercent) || 0,
      dims,
      speed,
    },
    total: toINR(total),
  };
}
