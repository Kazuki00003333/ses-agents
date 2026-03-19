import { NextResponse } from "next/server";
import { Pool } from "pg";
import dns from "dns";

// Force IPv4 to avoid IPv6-only Supabase DNS issues on Vercel
dns.setDefaultResultOrder("ipv4first");

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "DATABASE_URL not set" });

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query("SELECT current_user");
    await pool.end();
    return NextResponse.json({ ok: true, user: result.rows[0].current_user });
  } catch (e) {
    await pool.end().catch(() => {});
    const err = e as { message?: string; code?: string };
    return NextResponse.json({ ok: false, code: err.code, message: err.message });
  }
}
