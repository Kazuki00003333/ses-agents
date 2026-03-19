import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query("SELECT current_user, version()");
    await pool.end();
    return NextResponse.json({ ok: true, user: result.rows[0] });
  } catch (e) {
    await pool.end().catch(() => {});
    const err = e as { message?: string; code?: string };
    return NextResponse.json({
      ok: false,
      code: err.code,
      message: err.message,
      url_host: url.replace(/:([^@]+)@/, ":***@"),
    }, { status: 500 });
  }
}
