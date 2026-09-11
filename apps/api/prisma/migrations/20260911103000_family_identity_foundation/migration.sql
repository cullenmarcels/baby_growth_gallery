CREATE TYPE "FamilyRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "FamilyMembershipStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED');
CREATE TYPE "FamilyActivityVisibility" AS ENUM ('ACTIVE', 'TOMBSTONED');

CREATE TABLE "families" (
    "id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "created_by_account_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_memberships" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "role" "FamilyRole" NOT NULL,
    "status" "FamilyMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "display_name" VARCHAR(30) NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "family_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_invitations" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "created_by_membership_id" UUID NOT NULL,
    "token_digest" VARCHAR(64) NOT NULL,
    "role" "FamilyRole" NOT NULL DEFAULT 'MEMBER',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "used_by_account_id" UUID,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "family_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_activities" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "actor_membership_id" UUID,
    "type" VARCHAR(64) NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "subject_type" VARCHAR(40),
    "subject_id" VARCHAR(64),
    "summary_payload" JSONB NOT NULL,
    "visibility" "FamilyActivityVisibility" NOT NULL DEFAULT 'ACTIVE',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tombstoned_at" TIMESTAMPTZ(3),
    CONSTRAINT "family_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "families_created_by_account_id_idx" ON "families"("created_by_account_id");
CREATE UNIQUE INDEX "family_memberships_family_id_account_id_key" ON "family_memberships"("family_id", "account_id");
CREATE INDEX "family_memberships_account_id_status_joined_at_idx" ON "family_memberships"("account_id", "status", "joined_at");
CREATE INDEX "family_memberships_family_id_status_role_idx" ON "family_memberships"("family_id", "status", "role");
CREATE UNIQUE INDEX "family_memberships_one_active_owner_idx" ON "family_memberships"("family_id") WHERE "status" = 'ACTIVE' AND "role" = 'OWNER';
CREATE UNIQUE INDEX "family_invitations_token_digest_key" ON "family_invitations"("token_digest");
CREATE INDEX "family_invitations_family_id_used_at_revoked_at_expires_at_idx" ON "family_invitations"("family_id", "used_at", "revoked_at", "expires_at");
CREATE INDEX "family_invitations_created_by_membership_id_idx" ON "family_invitations"("created_by_membership_id");
CREATE INDEX "family_activities_family_id_occurred_at_id_idx" ON "family_activities"("family_id", "occurred_at" DESC, "id" DESC);
CREATE INDEX "family_activities_actor_membership_id_idx" ON "family_activities"("actor_membership_id");

ALTER TABLE "families" ADD CONSTRAINT "families_created_by_account_id_fkey" FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "family_memberships" ADD CONSTRAINT "family_memberships_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_memberships" ADD CONSTRAINT "family_memberships_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "family_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_used_by_account_id_fkey" FOREIGN KEY ("used_by_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "family_activities" ADD CONSTRAINT "family_activities_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_activities" ADD CONSTRAINT "family_activities_actor_membership_id_fkey" FOREIGN KEY ("actor_membership_id") REFERENCES "family_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
