-- ============================================================
-- Row Level Security (RLS) を全テーブルに有効化
--
-- 目的: SupabaseのREST API (PostgREST) 経由での
--       anon/authenticated ロールによる直接アクセスをブロックする。
--
-- 影響範囲:
--   - Prisma (直接PostgreSQL接続・superuserはRLSをバイパス) → 影響なし
--   - Supabase REST API (anon/authenticatedロール) → アクセス拒否
-- ============================================================

-- RLS を有効化
ALTER TABLE "users"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "candidates"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evaluations"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evaluation_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_logs"            ENABLE ROW LEVEL SECURITY;

-- anon/authenticated ロールからのアクセスを明示的に拒否
-- (Supabase環境でのみ anon/authenticated ロールが存在するため条件付きで実行)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "users"              FROM anon;
    REVOKE ALL ON "projects"           FROM anon;
    REVOKE ALL ON "candidates"         FROM anon;
    REVOKE ALL ON "evaluations"        FROM anon;
    REVOKE ALL ON "evaluation_results" FROM anon;
    REVOKE ALL ON "audit_logs"         FROM anon;
    REVOKE ALL ON "ai_logs"            FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "users"              FROM authenticated;
    REVOKE ALL ON "projects"           FROM authenticated;
    REVOKE ALL ON "candidates"         FROM authenticated;
    REVOKE ALL ON "evaluations"        FROM authenticated;
    REVOKE ALL ON "evaluation_results" FROM authenticated;
    REVOKE ALL ON "audit_logs"         FROM authenticated;
    REVOKE ALL ON "ai_logs"            FROM authenticated;
  END IF;
END $$;
