import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { pool } from '@/lib/db';
import { calculatePrice } from '@/lib/pricing';
import { escapeHtml, sendMail } from '@/lib/mail';

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
            <td valign="middle" style="padding-right:12px"><img src="https://autoaiexpo.com/assets/images/AutoAI.webp" width="128" alt="Auto AI Expo" style="display:block;width:128px;max-width:100%;height:auto;border:0"></td>
            <td align="right" valign="middle" style="font-size:11px;line-height:1.5;letter-spacing:1.2px;font-weight:bold;color:#ee4123">OFFICIAL<br><span style="letter-spacing:.5px;color:#55555d;font-weight:normal">REGISTRATION EMAIL</span></td>
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
