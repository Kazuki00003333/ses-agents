import { NextResponse } from "next/server";
import { Pool } from "pg";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const REF = "kudtuedflcehxlrblmlw";
const PASS = process.env.DB_PASS || "";
const REGIONS = ["ap-northeast-1", "ap-southeast-1", "us-east-1", "us-west-2", "eu-west-1"];

async function tryUrl(url: string, label: string) {
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
  try {
    await pool.query("SELECT 1");
    await pool.end();
    return { label, ok: true };
  } catch (e) {
    await pool.end().catch(() => {});
    return { label, ok: false, err: (e as Error).message.slice(0, 100) };
  }
}

export async function GET() {
  const tests = [];

  for (const region of REGIONS) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    // パターン1: postgres.[ref] (Supavisor標準)
    tests.push(tryUrl(`postgresql://postgres.${REF}:${PASS}@${host}:6543/postgres`, `${region}:6543 user=postgres.ref`));
    // パターン2: postgres のみ
    tests.push(tryUrl(`postgresql://postgres:${PASS}@${host}:6543/postgres`, `${region}:6543 user=postgres`));
    // パターン3: session mode port 5432
    tests.push(tryUrl(`postgresql://postgres.${REF}:${PASS}@${host}:5432/postgres`, `${region}:5432 user=postgres.ref`));
  }

  const results = await Promise.all(tests);
  const success = results.filter(r => r.ok);
  const failures = results.filter(r => !r.ok);

  return NextResponse.json({ success, failures });
}
