-- CreateEnum
CREATE TYPE "GrowthRecordStatus" AS ENUM ('ACTIVE', 'TRASHED');

-- CreateEnum
CREATE TYPE "GrowthMeasurementPosition" AS ENUM ('RECUMBENT', 'STANDING');

-- CreateTable
CREATE TABLE "growth_records" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "created_by_membership_id" UUID NOT NULL,
    "measured_on" DATE NOT NULL,
    "length_cm" DECIMAL(7,1),
    "weight_kg" DECIMAL(8,2),
    "head_cm" DECIMAL(7,1),
    "measurement_position" "GrowthMeasurementPosition",
    "note" VARCHAR(1000),
    "status" "GrowthRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "trashed_at" TIMESTAMPTZ(3),
    "trashed_by_membership_id" UUID,
    "trashed_by_role" "FamilyRole",
    "purge_after" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "growth_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "growth_records_family_id_baby_id_status_measured_on_created_idx" ON "growth_records"("family_id", "baby_id", "status", "measured_on" DESC, "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "growth_records_status_purge_after_idx" ON "growth_records"("status", "purge_after");

-- CreateIndex
CREATE INDEX "growth_records_created_by_membership_id_idx" ON "growth_records"("created_by_membership_id");

-- CreateIndex
CREATE INDEX "growth_records_trashed_by_membership_id_idx" ON "growth_records"("trashed_by_membership_id");

-- AddForeignKey
ALTER TABLE "growth_records" ADD CONSTRAINT "growth_records_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_records" ADD CONSTRAINT "growth_records_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_records" ADD CONSTRAINT "growth_records_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "family_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_records" ADD CONSTRAINT "growth_records_trashed_by_membership_id_fkey" FOREIGN KEY ("trashed_by_membership_id") REFERENCES "family_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Persist domain invariants for all writers, including maintenance and fixtures.
ALTER TABLE "growth_records" ADD CONSTRAINT "growth_measurements_valid" CHECK (
  (length_cm IS NOT NULL OR weight_kg IS NOT NULL OR head_cm IS NOT NULL)
  AND (length_cm IS NULL OR length_cm > 0)
  AND (weight_kg IS NULL OR weight_kg > 0)
  AND (head_cm IS NULL OR head_cm > 0)
  AND ((length_cm IS NULL AND measurement_position IS NULL) OR (length_cm IS NOT NULL AND measurement_position IS NOT NULL))
  AND version > 0
);
ALTER TABLE "growth_records" ADD CONSTRAINT "growth_recycle_valid" CHECK (
  (status = 'ACTIVE' AND trashed_at IS NULL AND purge_after IS NULL AND trashed_by_membership_id IS NULL AND trashed_by_role IS NULL)
  OR (status = 'TRASHED' AND trashed_at IS NOT NULL AND purge_after IS NOT NULL AND trashed_by_membership_id IS NOT NULL AND trashed_by_role IS NOT NULL)
);
