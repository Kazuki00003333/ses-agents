-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('first_contact', 'needs_hearing', 'project_proposal', 'follow_up', 'closing', 'other');

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "sales_user_id" TEXT NOT NULL,
    "company_name" TEXT,
    "contact_name" TEXT,
    "meeting_purpose" TEXT,
    "meeting_gains" TEXT,
    "info_memo" TEXT,
    "project_possibility" TEXT,
    "required_skill_sense" TEXT,
    "budget_sense" TEXT,
    "timing_sense" TEXT,
    "meeting_type" "MeetingType",
    "next_action" TEXT,
    "minutes_raw_text" TEXT,
    "meeting_date" TIMESTAMP(3),
    "ai_follow_up_advice" JSONB,
    "ai_quality_score" INTEGER,
    "ai_quality_label" TEXT,
    "ai_quality_comment" TEXT,
    "ai_strengths" JSONB,
    "ai_improvements" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meetings_sales_user_id_idx" ON "meetings"("sales_user_id");

-- CreateIndex
CREATE INDEX "meetings_created_at_idx" ON "meetings"("created_at");

-- CreateIndex
CREATE INDEX "meetings_meeting_date_idx" ON "meetings"("meeting_date");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_sales_user_id_fkey" FOREIGN KEY ("sales_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
