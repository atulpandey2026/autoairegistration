import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'node:crypto';
import { pool } from '@/lib/db';
import { calculatePrice } from '@/lib/pricing';
import { escapeHtml, sendMail } from '@/lib/mail';
export const runtime = 'nodejs';
const clean = (v: unknown, max=190) => String(v ?? '').trim().slice(0,max);
const emailOk = (v:string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export async function POST(req: NextRequest) {
 let conn:any;
 try {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) return NextResponse.json({error:'Request origin could not be verified.'},{status:403});
  const body = await req.json();
  if (clean(body.website,200)) return NextResponse.json({error:'Unable to process registration.'},{status:400});
  if (body.consent !== true) return NextResponse.json({error:'Please accept the registration terms.'},{status:400});
  const contact_name=clean(body.contact_name,150), email=clean(body.email,190).toLowerCase(), phone=clean(body.phone,35), company=clean(body.company,190), designation=clean(body.designation,150), gstin=clean(body.gstin,20), billing_address=clean(body.billing_address,500);
  const count=Number(body.delegate_count);
  if (!contact_name || !emailOk(email) || !phone || !company) return NextResponse.json({error:'Please provide a valid name, work email, mobile number and company.'},{status:400});
  if (!Number.isInteger(count)||count<1||count>100) return NextResponse.json({error:'Delegate count must be between 1 and 100.'},{status:400});
  if (!Array.isArray(body.delegates)||body.delegates.length!==count) return NextResponse.json({error:'Please complete the details for every delegate.'},{status:400});
  const delegates=body.delegates.map((d:any)=>({name:clean(d.name,150),email:clean(d.email,190).toLowerCase(),phone:clean(d.phone,35),designation:clean(d.designation,150),company:clean(d.company,190)}));
  if (delegates.some((d:any)=>!d.name||!emailOk(d.email)||!d.company)) return NextResponse.json({error:'Every delegate needs a name, valid email and company.'},{status:400});
  const allEmails=[...delegates.map((d:any)=>d.email)];
  if (new Set(allEmails).size!==allEmails.length) return NextResponse.json({error:'Each delegate must have a different email address.'},{status:400});
  const pricing=calculatePrice(count); const code=`AAE-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  conn=await pool.getConnection(); await conn.beginTransaction();
  const [ins]:any=await conn.execute(`INSERT INTO registrations (registration_code,contact_name,email,phone,company,designation,gstin,billing_address,pass_name,delegate_count,unit_price,subtotal,gst_rate,gst_amount,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[code,contact_name,email,phone,company,designation,gstin,billing_address,pricing.category,count,pricing.unit,pricing.subtotal,pricing.gstRate,pricing.gst,pricing.total]);
  const registrationId=ins.insertId;
  for(const d of delegates){await conn.execute('INSERT INTO delegates (registration_id,full_name,email,phone,designation,company,pass_token) VALUES (?,?,?,?,?,?,?)',[registrationId,d.name,d.email,d.phone,d.designation,d.company,randomUUID().replaceAll('-','')]);}
  const esc=(s:string)=>escapeHtml(s);
  const delegateRows=delegates.map((d:any,i:number)=>`<tr><td>${i+1}</td><td>${esc(d.name)}</td><td>${esc(d.email)}</td><td>${esc(d.company)}</td></tr>`).join('');
  const html=`<div style="font-family:Arial,sans-serif;color:#222;max-width:680px;margin:auto"><h2 style="color:#ee4123">Auto AI Expo 2026 — Registration received</h2><p>Dear ${esc(contact_name)},</p><p>Thank you for registering for Auto AI Expo. Our team will connect with you soon regarding further details and payment terms. No online payment has been collected.</p><p><strong>Registration reference:</strong> ${code}</p><p><strong>Company:</strong> ${esc(company)}<br><strong>Pass:</strong> ${esc(pricing.category)}<br><strong>Delegates:</strong> ${count}</p><table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%"><tr><td>Subtotal</td><td>₹${pricing.subtotal.toLocaleString('en-IN')}</td></tr><tr><td>GST (${pricing.gstRate}%)</td><td>₹${pricing.gst.toLocaleString('en-IN')}</td></tr><tr><th>Total payable</th><th>₹${pricing.total.toLocaleString('en-IN')}</th></tr></table><h3>Delegate details</h3><table cellpadding="7" cellspacing="0" border="1" style="border-collapse:collapse;width:100%"><tr><th>#</th><th>Name</th><th>Email</th><th>Company</th></tr>${delegateRows}</table><p>Regards,<br>Auto AI Expo Registration Team</p></div>`;
  const adminHtml=`<h2>New Auto AI Expo registration</h2><p><b>Reference:</b> ${code}</p><p><b>Contact:</b> ${esc(contact_name)} · ${esc(email)} · ${esc(phone)}</p><p><b>Company:</b> ${esc(company)} · <b>Delegates:</b> ${count}</p><p><b>Total:</b> ₹${pricing.total.toLocaleString('en-IN')}</p>${html}`;
  const [contactMail]:any=await conn.execute('INSERT INTO email_queue (recipient,subject,body) VALUES (?,?,?)',[email,`Auto AI Expo registration received — ${code}`,html]);
  const mailIds=[Number(contactMail.insertId)];
  if(process.env.ADMIN_NOTIFICATION_EMAIL){const [adminMail]:any=await conn.execute('INSERT INTO email_queue (recipient,subject,body) VALUES (?,?,?)',[process.env.ADMIN_NOTIFICATION_EMAIL,`New registration — ${code}`,adminHtml]);mailIds.push(Number(adminMail.insertId));}
  await conn.commit(); conn.release(); conn=null;
  // Send immediately; queued records remain in DB for retry if SMTP fails.
  for(const mailId of mailIds){const [mailRows]:any=await pool.execute('SELECT id,recipient,subject,body FROM email_queue WHERE id=?',[mailId]);const row=mailRows[0];if(!row)continue;try{await sendMail(row.recipient,row.subject,row.body);await pool.execute('UPDATE email_queue SET status="Sent",sent_at=NOW(),attempts=attempts+1,last_error=NULL WHERE id=?',[row.id]);}catch(e){await pool.execute('UPDATE email_queue SET attempts=attempts+1,last_error=? WHERE id=?',[String(e).slice(0,250),row.id]);}}
  return NextResponse.json({ok:true,registrationCode:code},{status:201});
 } catch(e:any) {
  if(conn){try{await conn.rollback();}catch{}conn.release();}
  console.error('Registration submission failed:',e?.message||e);
  return NextResponse.json({error:'We could not save your registration. Please try again later or contact the event team.'},{status:500});
 }
}
