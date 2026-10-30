import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAdminId } from '@/lib/auth';
import { escapeHtml, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

const REGISTRATION_STATUSES = ['Pending', 'Confirmed', 'Cancelled'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Cancelled', 'Partially Paid', 'Refunded'];

function statusEmailHtml(input: {
  contactName: string;
  registrationCode: string;
  company: string;
  registrationStatus: string;
  paymentStatus: string;
  changedLabel: string;
  oldValue: string;
  newValue: string;
}) {
  const e = escapeHtml;
  const statusColor = input.newValue === 'Confirmed' || input.newValue === 'Paid' ? '#178343' : input.newValue === 'Cancelled' ? '#b42318' : '#ee4123';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#202124;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">An update has been made to your Auto AI Expo registration ${e(input.registrationCode)}.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e4e7eb;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:25px 30px;background:#111115;border-bottom:4px solid #ee4123;">
          <div style="font-size:11px;letter-spacing:2px;font-weight:700;color:#ffffff;text-transform:uppercase;">AUTO AI EXPO</div>
          <div style="font-size:25px;line-height:1.25;font-weight:700;color:#ffffff;margin-top:8px;">Registration update</div>
          <div style="font-size:13px;color:#d8d8dc;margin-top:6px;">Your registration details have been updated by our team.</div>
        </td></tr>
        <tr><td style="padding:30px;">
          <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">Dear ${e(input.contactName)},</p>
          <p style="font-size:14px;line-height:1.7;color:#50565c;margin:0 0 22px;">This is to let you know that an update has been made to your Auto AI Expo registration. Please review the details below for your records.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e4e7eb;border-radius:10px;overflow:hidden;">
            <tr><td style="padding:13px 15px;background:#f8f9fa;color:#687078;font-size:12px;width:42%;">Registration reference</td><td style="padding:13px 15px;background:#f8f9fa;font-size:13px;font-weight:700;color:#202124;">${e(input.registrationCode)}</td></tr>
            <tr><td style="padding:13px 15px;border-top:1px solid #e4e7eb;color:#687078;font-size:12px;">Company</td><td style="padding:13px 15px;border-top:1px solid #e4e7eb;font-size:13px;font-weight:600;">${e(input.company)}</td></tr>
            <tr><td style="padding:13px 15px;border-top:1px solid #e4e7eb;color:#687078;font-size:12px;">Registration status</td><td style="padding:13px 15px;border-top:1px solid #e4e7eb;font-size:13px;font-weight:700;">${e(input.registrationStatus)}</td></tr>
            <tr><td style="padding:13px 15px;border-top:1px solid #e4e7eb;color:#687078;font-size:12px;">Payment status</td><td style="padding:13px 15px;border-top:1px solid #e4e7eb;font-size:13px;font-weight:700;">${e(input.paymentStatus)}</td></tr>
          </table>
          <div style="margin:22px 0 20px;padding:17px 18px;background:#fff3ef;border:1px solid #ffd9cf;border-radius:10px;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#8c3525;">What changed</div>
            <div style="font-size:15px;font-weight:700;margin-top:7px;color:#202124;">${e(input.changedLabel)}</div>
            <div style="font-size:13px;line-height:1.6;color:#50565c;margin-top:5px;">${e(input.oldValue)} <span style="color:#8a8f95;">→</span> <strong style="color:${statusColor};">${e(input.newValue)}</strong></div>
          </div>
          <p style="font-size:13px;line-height:1.7;color:#50565c;margin:0 0 22px;">If you have any questions about this update, please contact the Auto AI Expo team using your existing event communication channel.</p>
          <p style="font-size:14px;line-height:1.8;margin:0;">Regards,<br><strong>Team Auto AI Expo</strong><br><span style="color:#687078;font-size:12px;">The Autonaut Media | Bharat Network Group</span></p>
        </td></tr>
        <tr><td style="padding:16px 30px;background:#f8f9fa;border-top:1px solid #e4e7eb;font-size:11px;line-height:1.6;color:#858b92;">This is an automated notification about a change to your registration record. Please keep it for your reference.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function GET() {
  if (!await getAdminId()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const [rows]: any = await pool.query(`SELECT r.id,r.registration_code,r.contact_name,r.email,r.phone,r.company,r.designation,r.pass_name,r.delegate_count,r.subtotal,r.gst_amount,r.total,r.payment_status,r.status,r.created_at,COUNT(d.id) AS saved_delegates FROM registrations r LEFT JOIN delegates d ON d.registration_id=r.id GROUP BY r.id ORDER BY r.created_at DESC LIMIT 500`);
    const ids = rows.map((r: any) => Number(r.id));
    const [delegateRows]: any = ids.length
      ? await pool.query(`SELECT id,registration_id,full_name,email,phone,designation,company FROM delegates WHERE registration_id IN (${ids.map(() => '?').join(',')}) ORDER BY registration_id,id`, ids)
      : [[]];
    const byRegistration = new Map<number, any[]>();
    for (const d of delegateRows) {
      const key = Number(d.registration_id);
      if (!byRegistration.has(key)) byRegistration.set(key, []);
      byRegistration.get(key)!.push(d);
    }
    for (const row of rows) row.delegates = byRegistration.get(Number(row.id)) || [];
    const [stats]: any = await pool.query(`SELECT COUNT(*) registrations,COALESCE(SUM(delegate_count),0) delegates,COALESCE(SUM(total),0) value,COALESCE(SUM(CASE WHEN payment_status='Paid' THEN total ELSE 0 END),0) paid FROM registrations`);
    return NextResponse.json({ rows, stats: stats[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Could not load registrations.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!await getAdminId()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const b = await req.json();
    const id = Number(b.id);
    const status = String(b.status || '');
    const payment = String(b.payment_status || '');
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid registration.' }, { status: 400 });
    if (!REGISTRATION_STATUSES.includes(status) || !PAYMENT_STATUSES.includes(payment)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });

    const [found]: any = await pool.execute('SELECT id,registration_code,contact_name,email,company,status,payment_status FROM registrations WHERE id=? LIMIT 1', [id]);
    const old = found?.[0];
    if (!old) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });

    const changes: Array<{ label: string; oldValue: string; newValue: string }> = [];
    if (old.status !== status) changes.push({ label: 'Registration status', oldValue: String(old.status), newValue: status });
    if (old.payment_status !== payment) changes.push({ label: 'Payment status', oldValue: String(old.payment_status), newValue: payment });

    await pool.execute('UPDATE registrations SET status=?,payment_status=? WHERE id=?', [status, payment, id]);

    // Send one notification per actual status change. No email is sent when values are unchanged.
    const mailWarnings: string[] = [];
    for (const change of changes) {
      const html = statusEmailHtml({
        contactName: String(old.contact_name || 'there'),
        registrationCode: String(old.registration_code),
        company: String(old.company || ''),
        registrationStatus: status,
        paymentStatus: payment,
        changedLabel: change.label,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
      try {
        await sendMail(String(old.email), `Auto AI Expo registration update — ${change.label}: ${change.newValue} | ${old.registration_code}`, html);
      } catch (mailError) {
        console.error(`Could not send ${change.label} email for ${old.registration_code}:`, mailError);
        mailWarnings.push(`The status was saved, but the ${change.label.toLowerCase()} notification email could not be sent. Check SMTP settings/logs.`);
      }
    }
    return NextResponse.json({ ok: true, emailWarnings: mailWarnings });
  } catch (e) {
    console.error('Registration status update failed:', e);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await getAdminId()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const type = String(body.type || '');
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'Invalid record.' }, { status: 400 });

    if (type === 'registration') {
      const [result]: any = await pool.execute('DELETE FROM registrations WHERE id=?', [id]);
      if (!result.affectedRows) return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
      // delegates are removed by the database's ON DELETE CASCADE constraint.
      // Deliberately do not send any email when records are deleted.
      return NextResponse.json({ ok: true, deleted: 'registration' });
    }

    if (type === 'delegate') {
      const registrationId = Number(body.registration_id);
      if (!Number.isInteger(registrationId) || registrationId < 1) return NextResponse.json({ error: 'Invalid registration reference.' }, { status: 400 });
      const [result]: any = await pool.execute('DELETE FROM delegates WHERE id=? AND registration_id=?', [id, registrationId]);
      if (!result.affectedRows) return NextResponse.json({ error: 'Delegate record not found.' }, { status: 404 });
      // Deliberately do not send any email when a delegate record is deleted.
      return NextResponse.json({ ok: true, deleted: 'delegate' });
    }

    return NextResponse.json({ error: 'Invalid deletion type.' }, { status: 400 });
  } catch (e) {
    console.error('Record deletion failed:', e);
    return NextResponse.json({ error: 'Could not delete the record.' }, { status: 500 });
  }
}
