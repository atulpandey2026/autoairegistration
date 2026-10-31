import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { pool } from '@/lib/db';
import { calculatePrice } from '@/lib/pricing';
import { escapeHtml } from '@/lib/mail';

export const runtime = 'nodejs';

const EVENT_YEAR = 2027;
const clean = (v: unknown, max = 190) => String(v ?? '').trim().slice(0, max);
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

function buildRegistrationEmail(data: {
  contactName: string;
  company: string;
  code: string;
  passName: string;
  count: number;
  subtotal: number;
  gstRate: number;
  gst: number;
  total: number;
  delegateRows: string;
  adminNotification?: boolean;
}) {
  const greeting = data.adminNotification
    ? '<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#34343a">A new Auto AI Expo 2027 registration has been received.</p>'
    : `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#34343a">Dear ${escapeHtml(data.contactName)},</p>
       <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#34343a">Thank you for registering for <strong>Auto AI Expo 2027</strong>. We have received your registration, and our team will be in touch with you regarding the next steps and payment process. No online payment has been collected through this registration form.</p>`;

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111115;-webkit-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;padding:26px 10px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;background:#ffffff;border:1px solid #ececec;border-radius:14px;overflow:hidden">
        <tr><td style="height:6px;background:#ee4123;font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:26px 30px 20px;background:#fff8f3;border-bottom:1px solid #f3e7df">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" valign="middle"><img src="https://autoaiexpo.com/assets/images/AutoAI.webp" width="128" alt="Auto AI Expo" style="display:block;width:128px;max-width:100%;height:auto;border:0;margin:0 auto"></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:30px 30px 8px">
          <div style="display:inline-block;padding:7px 12px;background:#fff0e9;border:1px solid #ffd9c9;border-radius:20px;color:#c9361e;font-size:11px;font-weight:bold;letter-spacing:.8px;text-transform:uppercase">${data.adminNotification ? 'New registration' : 'Registration received'}</div>
          <h1 style="margin:16px 0 12px;font-size:27px;line-height:1.25;letter-spacing:-.5px;color:#111115">Auto AI Expo 2027 — Registration received</h1>
          ${greeting}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 24px;background:#fff8f3;border:1px solid #f1dfd4;border-radius:10px">
            <tr><td style="padding:16px 18px">
              <div style="font-size:11px;line-height:1.5;color:#777780;text-transform:uppercase;letter-spacing:1px;font-weight:bold">Registration reference</div>
              <div style="font-size:23px;line-height:1.4;font-weight:bold;letter-spacing:.5px;color:#ee4123;margin-top:4px">${escapeHtml(data.code)}</div>
              <div style="font-size:12px;line-height:1.6;color:#66666f;margin-top:5px">Please keep this reference for future communication.</div>
            </td></tr>
          </table>
          <h2 style="font-size:17px;line-height:1.4;margin:0 0 12px;color:#111115">Registration summary</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px;line-height:1.5">
            <tr><td style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#66666f;width:42%">Company</td><td style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#111115;font-weight:bold">${escapeHtml(data.company)}</td></tr>
            <tr><td style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#66666f">Registration category</td><td style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#111115">${escapeHtml(data.passName)}</td></tr>
            <tr><td style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#66666f">Number of delegates</td><td style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#111115">${data.count}</td></tr>
          </table>
          <h2 style="font-size:17px;line-height:1.4;margin:25px 0 12px;color:#111115">Fee summary</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px;line-height:1.5">
            <tr><td style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#66666f">Subtotal</td><td align="right" style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#111115">${money(data.subtotal)}</td></tr>
            <tr><td style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#66666f">GST (${data.gstRate}%)</td><td align="right" style="padding:10px 12px;border-bottom:1px solid #eeeeee;color:#111115">${money(data.gst)}</td></tr>
            <tr><td style="padding:13px 12px;background:#fff8f3;color:#111115;font-weight:bold;border-bottom:1px solid #f1dfd4">Total payable</td><td align="right" style="padding:13px 12px;background:#fff8f3;color:#ee4123;font-size:17px;font-weight:bold;border-bottom:1px solid #f1dfd4">${money(data.total)}</td></tr>
          </table>
          <h2 style="font-size:17px;line-height:1.4;margin:26px 0 12px;color:#111115">Delegate details</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:12px;line-height:1.5">
            <tr style="background:#111115;color:#ffffff"><th align="left" style="padding:10px 8px;color:#ffffff">#</th><th align="left" style="padding:10px 8px;color:#ffffff">Name</th><th align="left" style="padding:10px 8px;color:#ffffff">Email</th><th align="left" style="padding:10px 8px;color:#ffffff">Company</th></tr>
            ${data.delegateRows}
          </table>
          <p style="margin:22px 0 10px;font-size:14px;line-height:1.7;color:#34343a">For event information, please visit <a href="https://autoaiexpo.com/" style="color:#ee4123;font-weight:bold;text-decoration:none">autoaiexpo.com</a>.</p>
          <p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#34343a">Regards,<br><strong style="color:#111115">Team Auto AI Expo</strong><br><span style="color:#66666f">The Autonaut Media | Bharat Network Group</span></p>
        </td></tr>
        <tr><td style="padding:20px 30px;background:#111115;color:#c8c8ce;font-size:11px;line-height:1.7;text-align:center">Auto AI Expo 2027<br>This is an automated registration email. Please keep your registration reference for future correspondence.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  let conn: any;
  try {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host && new URL(origin).host !== host) {
      return NextResponse.json({ error: 'Request origin could not be verified.' }, { status: 403 });
    }

    const body = await req.json();
    if (clean(body.website, 200)) return NextResponse.json({ error: 'Unable to process registration.' }, { status: 400 });
    if (body.consent !== true) return NextResponse.json({ error: 'Please accept the registration terms.' }, { status: 400 });

    const contact_name = clean(body.contact_name, 150);
    const email = clean(body.email, 190).toLowerCase();
    const phone = clean(body.phone, 35);
    const company = clean(body.company, 190);
    const designation = clean(body.designation, 150);
    const gstin = clean(body.gstin, 20);
    const billing_address = clean(body.billing_address, 500);
    const count = Number(body.delegate_count);

    if (!contact_name || !emailOk(email) || !phone || !company) {
      return NextResponse.json({ error: 'Please provide a valid name, work email, mobile number and company.' }, { status: 400 });
    }
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return NextResponse.json({ error: 'Delegate count must be between 1 and 100.' }, { status: 400 });
    }
    if (!Array.isArray(body.delegates) || body.delegates.length !== count) {
      return NextResponse.json({ error: 'Please complete the details for every delegate.' }, { status: 400 });
    }

    const delegates = body.delegates.map((d: any) => ({
      name: clean(d.name, 150),
      email: clean(d.email, 190).toLowerCase(),
      phone: clean(d.phone, 35),
      designation: clean(d.designation, 150),
      company: clean(d.company, 190),
    }));

    if (delegates.some((d: any) => !d.name || !emailOk(d.email) || !d.company)) {
      return NextResponse.json({ error: 'Every delegate needs a name, valid email and company.' }, { status: 400 });
    }
    const allEmails = delegates.map((d: any) => d.email);
    if (new Set(allEmails).size !== allEmails.length) {
      return NextResponse.json({ error: 'Each delegate must have a different email address.' }, { status: 400 });
    }

    const pricing = calculatePrice(count);
    conn = await pool.getConnection();

    // A per-year sequence row serializes number allocation so simultaneous registrations
    // cannot receive the same reference. The table is created automatically if needed.
    await conn.execute(`CREATE TABLE IF NOT EXISTS registration_sequences (
      year INT NOT NULL PRIMARY KEY,
      last_number BIGINT UNSIGNED NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await conn.beginTransaction();
    await conn.execute('INSERT IGNORE INTO registration_sequences (year, last_number) VALUES (?, 0)', [EVENT_YEAR]);
    const [sequenceRows]: any = await conn.execute('SELECT last_number FROM registration_sequences WHERE year=? FOR UPDATE', [EVENT_YEAR]);
    const [existingCodeRows]: any = await conn.execute('SELECT registration_code FROM registrations WHERE registration_code LIKE ? FOR UPDATE', [`AAIE-${EVENT_YEAR}-%`]);
    const existingMax = (existingCodeRows as any[]).reduce((max: number, row: any) => {
      const match = String(row.registration_code).match(new RegExp(`^AAIE-${EVENT_YEAR}-(\\d+)$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const nextNumber = Math.max(Number(sequenceRows[0]?.last_number || 0), existingMax) + 1;
    const code = `AAIE-${EVENT_YEAR}-${String(nextNumber).padStart(4, '0')}`;
    await conn.execute('UPDATE registration_sequences SET last_number=? WHERE year=?', [nextNumber, EVENT_YEAR]);

    const [ins]: any = await conn.execute(
      `INSERT INTO registrations (registration_code,contact_name,email,phone,company,designation,gstin,billing_address,pass_name,delegate_count,unit_price,subtotal,gst_rate,gst_amount,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [code, contact_name, email, phone, company, designation, gstin, billing_address, pricing.category, count, pricing.unit, pricing.subtotal, pricing.gstRate, pricing.gst, pricing.total],
    );
    const registrationId = ins.insertId;
    for (const d of delegates) {
      await conn.execute(
        'INSERT INTO delegates (registration_id,full_name,email,phone,designation,company,pass_token) VALUES (?,?,?,?,?,?,?)',
        [registrationId, d.name, d.email, d.phone, d.designation, d.company, randomUUID().replaceAll('-', '')],
      );
    }

    const delegateRows = delegates.map((d: any, i: number) => `
      <tr>
        <td style="padding:9px 8px;border-bottom:1px solid #eeeeee;color:#66666f">${i + 1}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #eeeeee;color:#111115">${escapeHtml(d.name)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #eeeeee;color:#111115;word-break:break-word">${escapeHtml(d.email)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #eeeeee;color:#111115">${escapeHtml(d.company)}</td>
      </tr>`).join('');

    const emailData = {
      contactName: contact_name,
      company,
      code,
      passName: pricing.category,
      count,
      subtotal: pricing.subtotal,
      gstRate: pricing.gstRate,
      gst: pricing.gst,
      total: pricing.total,
      delegateRows,
    };
    const contactHtml = buildRegistrationEmail(emailData);
    const adminHtml = buildRegistrationEmail({ ...emailData, adminNotification: true });

    const [contactMail]: any = await conn.execute(
      'INSERT INTO email_queue (recipient,subject,body) VALUES (?,?,?)',
      [email, 'Auto AI Expo 2027 — Registration received', contactHtml],
    );
    if (process.env.ADMIN_NOTIFICATION_EMAIL) {
      const [adminMail]: any = await conn.execute(
        'INSERT INTO email_queue (recipient,subject,body) VALUES (?,?,?)',
        [process.env.ADMIN_NOTIFICATION_EMAIL, `New Auto AI Expo 2027 registration — ${code}`, adminHtml],
      );
    }

    await conn.commit();
    conn.release();
    conn = null;

    // Email records are committed to the queue. A separate scheduled worker
    // sends them, so SMTP cannot delay the registration success response.
    return NextResponse.json({ ok: true, registrationCode: code }, { status: 201 });
  } catch (e: any) {
    if (conn) {
      try { await conn.rollback(); } catch { /* Ignore rollback errors. */ }
      conn.release();
    }
    console.error('Registration submission failed:', e?.message || e);
    return NextResponse.json({ error: 'We could not save your registration. Please try again later or contact the event team.' }, { status: 500 });
  }
}
