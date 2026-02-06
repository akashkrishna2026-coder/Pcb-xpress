// Currency helpers for formatting values in INR

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function formatInr(value) {
  const n = Number(value);
  return inrFormatter.format(Number.isFinite(n) ? n : 0);
}

