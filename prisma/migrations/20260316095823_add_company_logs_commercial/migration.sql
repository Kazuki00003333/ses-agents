-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "commercial_flow_depth" INTEGER,
ADD COLUMN     "commercial_flow_type" TEXT,
ADD COLUMN     "company_name" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "client_company_name" TEXT;

-- CreateTable
CREATE TABLE "ai_logs" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "user_input" TEXT NOT NULL,
    "raw_output" TEXT NOT NULL,
    "parsed_output" JSONB,
    "latency_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "related_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_logs_pkey" PRIMARY KEY ("id")
);
