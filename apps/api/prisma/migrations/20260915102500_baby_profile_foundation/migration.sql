CREATE TYPE "BabySex" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "BabyProfileStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'PURGING');

CREATE TABLE "baby_profiles" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "created_by_membership_id" UUID NOT NULL,
    "nickname" VARCHAR(30) NOT NULL,
    "birth_date" DATE NOT NULL,
    "sex" "BabySex",
    "status" "BabyProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMPTZ(3),
    "purge_after" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "baby_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "baby_profiles_archive_state_check" CHECK (
        ("status" = 'ACTIVE' AND "archived_at" IS NULL AND "purge_after" IS NULL)
        OR ("status" IN ('ARCHIVED', 'PURGING') AND "archived_at" IS NOT NULL AND "purge_after" IS NOT NULL)
    )
);

CREATE INDEX "baby_profiles_family_id_status_created_at_id_idx" ON "baby_profiles"("family_id", "status", "created_at" DESC, "id" DESC);
CREATE INDEX "baby_profiles_status_purge_after_idx" ON "baby_profiles"("status", "purge_after");
CREATE INDEX "baby_profiles_created_by_membership_id_idx" ON "baby_profiles"("created_by_membership_id");

ALTER TABLE "baby_profiles" ADD CONSTRAINT "baby_profiles_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "baby_profiles" ADD CONSTRAINT "baby_profiles_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "family_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
