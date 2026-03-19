import { NextResponse } from "next/server";
import { Pool } from "pg";

const REF = "kudtuedflcehxlrblmlw";
const PASS = process.env.DB_PASS || "";
const REGIONS = [
  "ap-northeast-1",
  "ap-southeast-1",
  "us-east-1",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
];

async function tryConnect(url: string): Promise<{ ok: boolean; error?: string }> {
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
  try {
    await pool.query("SELECT 1");
    await pool.end();
    return { ok: true };
  } catch (e) {
    await pool.end().catch(() => {});
    return { ok: false, error: (e as Error).message };
  }
}

export async function GET() {
  const results: Record<string, unknown> = {};

  for (const region of REGIONS) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const url = `postgresql://postgres.${REF}:${PASS}@${host}:6543/postgres`;
    results[region] = await tryConnect(url);
  }

  return NextResponse.json(results);
}
