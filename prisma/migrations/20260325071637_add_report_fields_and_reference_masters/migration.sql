-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('unprocessed', 'processed');

-- AlterTable
ALTER TABLE "daily_work_reports" ADD COLUMN     "billing_status" "BillingStatus" NOT NULL DEFAULT 'unprocessed',
ADD COLUMN     "signer_name" VARCHAR(100),
ADD COLUMN     "vehicle_identifier" VARCHAR(100),
ADD COLUMN     "work_location" VARCHAR(255);

-- CreateTable
CREATE TABLE "car_type_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "car_type_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_location_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "work_location_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_content_masters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "work_content_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_car_type_masters_name" ON "car_type_masters"("name");

-- CreateIndex
CREATE INDEX "idx_car_type_masters_name" ON "car_type_masters"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_work_location_masters_name" ON "work_location_masters"("name");

-- CreateIndex
CREATE INDEX "idx_work_location_masters_name" ON "work_location_masters"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_work_content_masters_name" ON "work_content_masters"("name");

-- CreateIndex
CREATE INDEX "idx_work_content_masters_name" ON "work_content_masters"("name");

-- CreateIndex
CREATE INDEX "idx_dwr_work_location" ON "daily_work_reports"("work_location");

-- CreateIndex
CREATE INDEX "idx_dwr_billing_status" ON "daily_work_reports"("billing_status");
