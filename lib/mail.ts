import nodemailer from 'nodemailer';

/**
 * Sends transactional email using the configured SMTP server.
 * Throws an error when SMTP delivery fails so the caller can record it.
 */
export async function sendMail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;

  const fromAddress = (
    process.env.MAIL_FROM_ADDRESS ||
    user ||
    ''
  ).trim();

  const fromName = (
    process.env.MAIL_FROM_NAME ||
    'Auto AI Expo'
  ).trim();

  const port = Number(process.env.SMTP_PORT || 465);

  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === 'true'
    : port === 465;

  if (!host || !user || !password) {
    throw new Error(
      'SMTP configuration missing: SMTP_HOST, SMTP_USER or SMTP_PASSWORD'
    );
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid SMTP_PORT configuration');
  }

  if (!fromAddress) {
    throw new Error('Missing sender email address');
  }

  if (!to.trim()) {
    throw new Error('Missing email recipient');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,

    auth: {
      user,
      pass: password,
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  try {
    const info = await transporter.sendMail({
      from: {
        name: fromName,
        address: fromAddress,
      },
      to,
      subject,
      html,
    });

    if (info.rejected?.length) {
      throw new Error(
        `SMTP rejected recipient(s): ${info.rejected.join(', ')}`
      );
    }
  } catch (error) {
    const details =
      error instanceof Error ? error.message : String(error);

    console.error('SMTP send failed:', {
      recipient: to,
      error: details,
    });

    throw error;
  } finally {
    transporter.close();
  }
}

/**
 * Escapes unsafe characters before inserting text into HTML.
 */
export const escapeHtml = (s: unknown): string =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c]!)
  );
