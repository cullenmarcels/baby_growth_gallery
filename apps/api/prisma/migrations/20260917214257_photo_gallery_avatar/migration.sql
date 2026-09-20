ALTER TABLE "baby_profiles"
  ADD COLUMN "avatar_photo_id" UUID;

CREATE UNIQUE INDEX "baby_profiles_avatar_photo_id_key"
  ON "baby_profiles"("avatar_photo_id");

ALTER TABLE "baby_profiles"
  ADD CONSTRAINT "baby_profiles_avatar_photo_id_fkey"
  FOREIGN KEY ("avatar_photo_id") REFERENCES "photos"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "photos_family_id_baby_id_status_captured_on_published_at_id_idx"
  ON "photos"("family_id", "baby_id", "status", "captured_on" DESC, "published_at" DESC, "id" DESC);
