BEGIN;

-- The local reset is a separate, explicitly scoped operation. Never discard data here.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "accounts") OR EXISTS (SELECT 1 FROM "families") THEN
    RAISE EXCEPTION 'Managed accounts require an empty account and family database. Back up and reset the intended local environment first.';
  END IF;
END $$;

DROP TABLE "family_invitations";
DROP INDEX "family_memberships_one_active_owner_idx";
ALTER TYPE "FamilyRole" RENAME TO "LegacyFamilyRole";
CREATE TYPE "FamilyRole" AS ENUM ('ADMIN', 'MEMBER');
ALTER TABLE "family_memberships" ALTER COLUMN "role" TYPE "FamilyRole"
  USING ("role"::text::"FamilyRole");
ALTER TABLE "photos" ALTER COLUMN "trashed_by_role" TYPE "FamilyRole"
  USING ("trashed_by_role"::text::"FamilyRole");
ALTER TABLE "growth_records" ALTER COLUMN "trashed_by_role" TYPE "FamilyRole"
  USING ("trashed_by_role"::text::"FamilyRole");
DROP TYPE "LegacyFamilyRole";

CREATE TYPE "SiteRole" AS ENUM ('USER', 'SUPER_ADMIN');
ALTER TABLE "accounts"
  DROP COLUMN "phone_e164",
  DROP COLUMN "phone_verified_at",
  ADD COLUMN "username" VARCHAR(32) NOT NULL,
  ADD COLUMN "site_role" "SiteRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "temporary_password_expires_at" TIMESTAMPTZ(3),
  ADD COLUMN "family_issued_password" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "created_by_account_id" UUID,
  ADD COLUMN "created_in_family_id" UUID,
  ADD COLUMN "accepted_legal_version" TEXT;

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_username_normalized"
  CHECK ("username" = normalize(translate("username", 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), NFC));
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts" ("username");
CREATE UNIQUE INDEX "accounts_single_super_admin_idx" ON "accounts" ("site_role") WHERE "site_role" = 'SUPER_ADMIN';

COMMIT;
