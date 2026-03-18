-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('sales', 'manager', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'sales',
    "team_name" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "sales_user_id" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "project_summary" TEXT,
    "must_skills" TEXT,
    "nice_to_have_skills" TEXT,
    "commercial_flow" INTEGER,
    "participation_period" TEXT,
    "unit_price" TEXT,
    "payment_site" TEXT,
    "working_hours" TEXT,
    "work_location" TEXT,
    "remote_type" TEXT,
    "interview_count" TEXT,
    "settlement_range" TEXT,
    "foreigner_allowed" TEXT,
    "age_limit" TEXT,
    "other_info" TEXT,
    "structured_input_json" JSONB,
    "ai_summary" TEXT,
    "ai_missing_info" JSONB,
    "ai_checklist" JSONB,
    "ai_insights" JSONB,
    "risk_flags" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "sales_user_id" TEXT NOT NULL,
    "candidate_code" TEXT,
    "candidate_name" TEXT,
    "age" INTEGER,
    "nearest_station" TEXT,
    "available_date" TEXT,
    "experience_years" TEXT,
    "main_skills" TEXT,
    "industry_experience" TEXT,
    "phase_experience" TEXT,
    "strengths" TEXT,
    "desired_conditions" TEXT,
    "ng_conditions" TEXT,
    "summary" TEXT,
    "skill_sheet_text" TEXT,
    "normalized_skills" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "sales_user_id" TEXT NOT NULL,
    "must_match_score" INTEGER,
    "nice_to_have_score" INTEGER,
    "job_fit_score" INTEGER,
    "condition_score" INTEGER,
    "start_timing_score" INTEGER,
    "summary_score" INTEGER,
    "total_score" INTEGER,
    "fitness_rate" INTEGER,
    "score_breakdown_json" JSONB,
    "ai_comment" TEXT,
    "concern_points" JSONB,
    "proposal_points" JSONB,
    "evaluation_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_results" (
    "id" TEXT NOT NULL,
    "evaluation_id" TEXT NOT NULL,
    "sales_user_id" TEXT NOT NULL,
    "proposed_flag" BOOLEAN NOT NULL DEFAULT false,
    "document_passed_flag" BOOLEAN NOT NULL DEFAULT false,
    "interview_passed_flag" BOOLEAN NOT NULL DEFAULT false,
    "closed_flag" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" TEXT,
    "sales_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_results_evaluation_id_key" ON "evaluation_results"("evaluation_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_sales_user_id_fkey" FOREIGN KEY ("sales_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_sales_user_id_fkey" FOREIGN KEY ("sales_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_sales_user_id_fkey" FOREIGN KEY ("sales_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_results" ADD CONSTRAINT "evaluation_results_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_results" ADD CONSTRAINT "evaluation_results_sales_user_id_fkey" FOREIGN KEY ("sales_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
