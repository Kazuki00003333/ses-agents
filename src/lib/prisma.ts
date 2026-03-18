import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    min: 0,                    // dev環境ではデーモン再起動時に古い接続が残らないよう0に
    max: 5,
    idleTimeoutMillis: 10000,  // 10秒でアイドル接続を解放（デーモン再起動後の死接続を早期解消）
    connectionTimeoutMillis: 30000,
  });
  // デーモン再起動などで接続が切れたらプールごと破棄して次回リクエストで再作成する
  pool.on("error", () => {
    pool.end().catch(() => {});
    globalForPrisma.pgPool = undefined;
    globalForPrisma.prisma = undefined;
  });
  pool.query("SELECT 1").catch(() => {});
  return pool;
}

function createPrismaClient() {
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = createPool();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(globalForPrisma.pgPool as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
