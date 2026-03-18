# SES Agents - 案件精査・営業戦略支援アプリ

SES営業向けの案件精査・候補者マッチング・営業戦略支援PoCアプリです。

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **DB**: PostgreSQL + Prisma ORM (v7)
- **認証**: NextAuth.js (Credentials)
- **LLM**: Anthropic Claude API (`claude-sonnet-4-6`)
- **デプロイ**: Vercel対応

## セットアップ

### 1. 環境変数

```bash
cp .env.example .env
```

`.env` を編集:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ses_agents?schema=public"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="your-api-key"
```

### 2. PostgreSQL起動（Docker）

```bash
docker run --name ses-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ses_agents \
  -p 5432:5432 -d postgres
```

### 3. DBマイグレーション

```bash
npm install
npx prisma migrate dev --name init
```

### 4. 起動

```bash
npm run dev
```

### 5. シードデータ投入

```bash
curl -X POST http://localhost:3000/api/seed
```

## デモアカウント

| ロール | メール | パスワード |
|--------|--------|----------|
| 管理者 | admin@example.com | password123 |
| マネージャー | manager@example.com | password123 |
| 営業 | sales1@example.com | password123 |
| 営業 | sales2@example.com | password123 |

## 実装機能

### 優先度A（MVP）
- ✅ ログイン / JWT認証 / ロール管理 (sales/manager/admin)
- ✅ 案件CRUD（登録・一覧・詳細）
- ✅ AI案件精査（要約・不足情報・チェックリスト・示唆・リスクフラグ）
- ✅ 案件テキスト → 構造化変換（AIによる項目分解）
- ✅ 候補者CRUD（登録・一覧・詳細）
- ✅ AIマッチング評価（適正率・スコア内訳・評価コメント・懸念点・提案ポイント）
- ✅ 評価結果保存（提案/書類通過/面談通過/成約/失注理由）

### 優先度B
- ✅ ダッシュボード（統計カード・最近の案件・最近の評価）
- ✅ マネージャー向け営業別サマリー

## 評価ロジック

適正率（合計100点）:
- Must一致: 40点
- 尚可一致: 15点
- 業務内容適合: 15点
- 条件一致: 10点
- 参画時期一致: 10点
- サマリー/文脈適合: 10点

| 適正率 | 判定 |
|--------|------|
| 85%以上 | 提案有力 |
| 70〜84% | 提案可能（補足推奨） |
| 50〜69% | 慎重提案 |
| 49%以下 | 要再確認 |
