import nodemailer from 'nodemailer';
export async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) throw new Error('SMTP is not configured');
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: process.env.SMTP_SECURE !== 'false', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
  await transporter.sendMail({ from: `"${process.env.MAIL_FROM_NAME || 'Auto AI Expo'}" <${process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER}>`, to, subject, html });
}
export const escapeHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
