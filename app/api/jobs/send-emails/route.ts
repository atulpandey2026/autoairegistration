import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { sendMail } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Call from a trusted scheduler every minute with:
// Authorization: Bearer <EMAIL_CRON_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.EMAIL_CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Lock rows before sending to avoid duplicate deliveries from overlapping jobs.
  // The lease uses 'Failed' as a temporary in-progress marker; only rows with
  // attempts < 3 are eligible for automatic retry.
  const connection = await pool.getConnection();
  let jobs: Array<{id: number; recipient: string; subject: string; body: string; attempts: number}> = [];
  try {
    await connection.beginTransaction();
    const [rows]: any = await connection.execute(
      `SELECT id, recipient, subject, body, attempts FROM email_queue
       WHERE status = 'Pending' AND attempts < 3
       ORDER BY id ASC LIMIT 10 FOR UPDATE SKIP LOCKED`
    );
    jobs = rows;
    for (const row of jobs) {
      await connection.execute(
        `UPDATE email_queue SET status='Failed', attempts=attempts+1,
         last_error='Sending in progress' WHERE id=?`, [row.id]
      );
    }
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }

  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      await sendMail(job.recipient, job.subject, job.body);
      await pool.execute(
        `UPDATE email_queue SET status='Sent', sent_at=NOW(), last_error=NULL WHERE id=?`,
        [job.id]
      );
      sent++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const nextStatus = Number(job.attempts) + 1 >= 3 ? 'Failed' : 'Pending';
      await pool.execute(
        `UPDATE email_queue SET status=?, last_error=? WHERE id=?`,
        [nextStatus, message.slice(0, 250), job.id]
      );
      failed++;
    }
  }
  return NextResponse.json({ processed: jobs.length, sent, failed });
}
