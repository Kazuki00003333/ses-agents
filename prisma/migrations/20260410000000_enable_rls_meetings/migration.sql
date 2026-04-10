-- meetingsテーブルおよび_prisma_migrationsにRLSを有効化
-- （20260402000000_enable_rlsの適用後に作成されたテーブルのため追加）

ALTER TABLE "meetings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "meetings" FROM anon;
    REVOKE ALL ON "_prisma_migrations" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "meetings" FROM authenticated;
    REVOKE ALL ON "_prisma_migrations" FROM authenticated;
  END IF;
END $$;
