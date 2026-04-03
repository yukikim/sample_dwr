-- AlterTable
ALTER TABLE "daily_work_reports" ADD COLUMN     "purchaser" VARCHAR(255);

-- CreateIndex
CREATE INDEX "idx_dwr_purchaser" ON "daily_work_reports"("purchaser");
