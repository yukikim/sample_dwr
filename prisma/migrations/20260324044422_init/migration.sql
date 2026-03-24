-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('new', 'existing');

-- CreateTable
CREATE TABLE "administrators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "administrators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_work_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_date" DATE NOT NULL,
    "client_code" VARCHAR(50) NOT NULL,
    "client_name" VARCHAR(255) NOT NULL,
    "work_minutes" INTEGER NOT NULL DEFAULT 0,
    "labor_minutes" INTEGER NOT NULL DEFAULT 0,
    "travel_minutes" INTEGER NOT NULL DEFAULT 0,
    "car_type" VARCHAR(100),
    "work_code" VARCHAR(50) NOT NULL,
    "customer_status" "CustomerStatus" NOT NULL,
    "unit_count" INTEGER NOT NULL DEFAULT 0,
    "sales_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "standard_minutes" INTEGER,
    "points" DECIMAL(10,2),
    "remarks" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_work_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_administrators_email" ON "administrators"("email");

-- CreateIndex
CREATE INDEX "idx_dwr_work_date" ON "daily_work_reports"("work_date");

-- CreateIndex
CREATE INDEX "idx_dwr_client_code" ON "daily_work_reports"("client_code");

-- CreateIndex
CREATE INDEX "idx_dwr_client_name" ON "daily_work_reports"("client_name");

-- CreateIndex
CREATE INDEX "idx_dwr_work_code" ON "daily_work_reports"("work_code");

-- CreateIndex
CREATE INDEX "idx_dwr_customer_status" ON "daily_work_reports"("customer_status");

-- CreateIndex
CREATE INDEX "idx_dwr_created_by" ON "daily_work_reports"("created_by");

-- CreateIndex
CREATE INDEX "idx_dwr_work_date_client_code" ON "daily_work_reports"("work_date", "client_code");

-- AddForeignKey
ALTER TABLE "daily_work_reports" ADD CONSTRAINT "daily_work_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "administrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
