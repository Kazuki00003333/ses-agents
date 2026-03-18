-- CreateIndex
CREATE INDEX "candidates_sales_user_id_idx" ON "candidates"("sales_user_id");

-- CreateIndex
CREATE INDEX "candidates_updated_at_idx" ON "candidates"("updated_at");

-- CreateIndex
CREATE INDEX "evaluation_results_sales_user_id_idx" ON "evaluation_results"("sales_user_id");

-- CreateIndex
CREATE INDEX "evaluation_results_created_at_idx" ON "evaluation_results"("created_at");

-- CreateIndex
CREATE INDEX "evaluations_sales_user_id_idx" ON "evaluations"("sales_user_id");

-- CreateIndex
CREATE INDEX "evaluations_project_id_idx" ON "evaluations"("project_id");

-- CreateIndex
CREATE INDEX "evaluations_candidate_id_idx" ON "evaluations"("candidate_id");

-- CreateIndex
CREATE INDEX "projects_sales_user_id_idx" ON "projects"("sales_user_id");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");
