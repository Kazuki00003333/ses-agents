import { NextResponse } from "next/server";
import { Pool } from "pg";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const REF = "kudtuedflcehxlrblmlw";
const PASS = process.env.DB_PASS || "";

async function tryUrl(url: string, label: string) {
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
  try {
    await pool.query("SELECT 1");
    await pool.end();
    return { label, ok: true };
  } catch (e) {
    await pool.end().catch(() => {});
    return { label, ok: false, err: (e as Error).message.slice(0, 120) };
  }
}

export async function GET() {
  const tests = await Promise.all([
    // 旧pgBouncer形式 (古いSupabaseプロジェクト)
    tryUrl(`postgresql://postgres:${PASS}@db.${REF}.supabase.co:6543/postgres`, "direct:6543 pgbouncer"),
    // 旧pgBouncer + mode=transaction
    tryUrl(`postgresql://postgres:${PASS}@db.${REF}.supabase.co:6543/postgres?pgbouncer=true`, "direct:6543 pgbouncer=true"),
    // 直接接続
    tryUrl(`postgresql://postgres:${PASS}@db.${REF}.supabase.co:5432/postgres`, "direct:5432"),
    // Supavisor ap-northeast-1
    tryUrl(`postgresql://postgres.${REF}:${PASS}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`, "supavisor:6543"),
    tryUrl(`postgresql://postgres.${REF}:${PASS}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`, "supavisor:5432"),
  ]);

  const success = tests.filter(r => r.ok);
  const failures = tests.filter(r => !r.ok);
  return NextResponse.json({ success, failures });
}
