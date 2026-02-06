// Stub email sender. Replace with a real provider (SendGrid, EmailJS, server API).

export async function sendQuoteEmail({ to, quote, specs, delivery, bomStats }) {
  // In production, POST to your backend or use EmailJS SDK here.
  // This stub simulates latency and success.
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { ok: true };
}

