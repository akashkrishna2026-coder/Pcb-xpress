import nodemailer from 'nodemailer';
import Setting from '../models/Setting.js';

// Fetch SMTP settings from DB (key: 'smtp'). If none configured, fall back to ethereal test account.
export async function createTransporter() {
  try {
    const doc = await Setting.findOne({ key: 'smtp' });
    const smtp = doc?.value || null;
    if (smtp && smtp.host && smtp.user) {
      const transportOptions = {
        host: smtp.host,
        port: Number(smtp.port) || 587,
        secure: Boolean(smtp.secure),
        auth: { user: smtp.user, pass: smtp.password },
      };
      return { transporter: nodemailer.createTransport(transportOptions), from: `${smtp.fromName || 'PCB Xpress'} <${smtp.fromEmail || smtp.user}>`, isTest: false };
    }
  } catch (e) {
    // ignore and fallback to ethereal
    console.error('Failed to load SMTP settings, falling back to test account', e);
  }

  // Fallback: use ethereal test account (good for local/dev)
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  const from = `PCB Xpress <${testAccount.user}>`;
  return { transporter, from, isTest: true };
}

export async function sendResetOtpEmail(toEmail, otp, opts = {}) {
  const { name = '', expireMinutes = 15 } = opts;
  const { transporter, from, isTest } = await createTransporter();
  const subject = 'Your PCB Xpress password reset code';
  const text = `Hello ${name || ''},\n\nWe received a request to reset your PCB Xpress password. Use the following one-time code to reset your password. This code expires in ${expireMinutes} minutes.\n\n${otp}\n\nIf you didn\'t request this, you can safely ignore this email.\n\n— PCB Xpress`;
  const html = `<p>Hello ${name || ''},</p><p>We received a request to reset your PCB Xpress password. Use the following one-time code to reset your password. This code expires in <strong>${expireMinutes} minutes</strong>.</p><h2 style="letter-spacing:4px">${otp}</h2><p>If you didn't request this, you can safely ignore this email.</p><p>— PCB Xpress</p>`;
  const info = await transporter.sendMail({ from, to: toEmail, subject, text, html });
  if (isTest) {
    // nodemailer.getTestMessageUrl(info) returns preview URL for ethereal messages
    try {
      const preview = nodemailer.getTestMessageUrl(info);
      console.info('Preview URL for sent email:', preview);
    } catch (e) {
      // ignore
    }
  }
  return info;
}
