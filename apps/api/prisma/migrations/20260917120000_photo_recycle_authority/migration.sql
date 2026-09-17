ALTER TABLE "photos"
  ADD COLUMN "trashed_by_membership_id" UUID,
  ADD COLUMN "trashed_by_role" "FamilyRole";

ALTER TABLE "photos"
  ADD CONSTRAINT "photos_trashed_by_membership_id_fkey"
  FOREIGN KEY ("trashed_by_membership_id") REFERENCES "family_memberships"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "photos_trashed_by_membership_id_idx"
  ON "photos"("trashed_by_membership_id");

ALTER TABLE "photos"
  ADD CONSTRAINT "photos_trash_actor_pair_check"
  CHECK (("trashed_by_membership_id" IS NULL) = ("trashed_by_role" IS NULL));
