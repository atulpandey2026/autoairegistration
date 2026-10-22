import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { setAdminSession } from '@/lib/auth';
export const runtime='nodejs';
export async function POST(req:NextRequest){try{const body=await req.json();const email=String(body.email||'').trim().toLowerCase();const password=String(body.password||'');if(!email||!password||password.length>200)return NextResponse.json({error:'Enter your email and password.'},{status:400});const [rows]:any=await pool.execute('SELECT id,password_hash FROM admins WHERE email=? LIMIT 1',[email]);if(!rows.length||!(await bcrypt.compare(password,rows[0].password_hash)))return NextResponse.json({error:'Invalid email or password.'},{status:401});await setAdminSession(Number(rows[0].id));return NextResponse.json({ok:true});}catch(e){console.error(e);return NextResponse.json({error:'Login service unavailable.'},{status:500});}}
