import { cookies } from 'next/headers';
import crypto from 'node:crypto';
const COOKIE = 'aaexpo_admin';
function sign(value: string) { return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'replace-this-session-secret').update(value).digest('hex'); }
export async function setAdminSession(adminId: number) {
  const value = `${adminId}.${Date.now() + 8 * 60 * 60 * 1000}`;
  const store = await cookies();
  store.set(COOKIE, `${value}.${sign(value)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 });
}
export async function clearAdminSession() { const store = await cookies(); store.delete(COOKIE); }
export async function getAdminId(): Promise<number | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split('.'); if (parts.length !== 3) return null;
  const value = `${parts[0]}.${parts[1]}`;
  const expected = sign(value);
  if (parts[2].length !== expected.length || !crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) return null;
  if (!/^\d+$/.test(parts[0]) || Number(parts[1]) < Date.now()) return null;
  return Number(parts[0]);
}
