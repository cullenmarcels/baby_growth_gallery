CREATE TYPE "PhotoStatus" AS ENUM ('AWAITING_UPLOAD', 'QUEUED', 'PROCESSING', 'DRAFT', 'PUBLISHED', 'TRASHED', 'FAILED', 'PURGING');
CREATE TYPE "PhotoSourceFormat" AS ENUM ('JPEG', 'PNG', 'WEBP', 'HEIC', 'HEIF');
CREATE TYPE "PhotoVariantKind" AS ENUM ('THUMBNAIL', 'DISPLAY', 'ARCHIVE');

CREATE TABLE "photo_upload_batches" (
  "id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "baby_id" UUID NOT NULL,
  "created_by_membership_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "photo_upload_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "photos" (
  "id" UUID NOT NULL,
  "upload_batch_id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "baby_id" UUID NOT NULL,
  "created_by_membership_id" UUID NOT NULL,
  "status" "PhotoStatus" NOT NULL DEFAULT 'AWAITING_UPLOAD',
  "declared_content_type" VARCHAR(100) NOT NULL,
  "declared_size_bytes" INTEGER NOT NULL,
  "source_format" "PhotoSourceFormat",
  "source_size_bytes" INTEGER,
  "source_sha256" VARCHAR(64),
  "source_width" INTEGER,
  "source_height" INTEGER,
  "title" VARCHAR(80),
  "description" VARCHAR(1000),
  "captured_on" DATE NOT NULL,
  "location" VARCHAR(80),
  "display_order" INTEGER NOT NULL,
  "quarantine_object_key" VARCHAR(120),
  "upload_window_expires_at" TIMESTAMPTZ(3) NOT NULL,
  "processing_attempts" INTEGER NOT NULL DEFAULT 0,
  "processing_lease_until" TIMESTAMPTZ(3),
  "next_processing_at" TIMESTAMPTZ(3),
  "failure_code" VARCHAR(64),
  "draft_expires_at" TIMESTAMPTZ(3),
  "published_at" TIMESTAMPTZ(3),
  "trashed_at" TIMESTAMPTZ(3),
  "purge_after" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "photo_variants" (
  "id" UUID NOT NULL,
  "photo_id" UUID NOT NULL,
  "kind" "PhotoVariantKind" NOT NULL,
  "object_key" VARCHAR(160) NOT NULL,
  "media_type" VARCHAR(40) NOT NULL DEFAULT 'image/webp',
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "sha256" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "photo_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "photos_quarantine_object_key_key" ON "photos"("quarantine_object_key");
CREATE INDEX "photo_upload_batches_family_id_baby_id_created_at_idx" ON "photo_upload_batches"("family_id", "baby_id", "created_at" DESC);
CREATE INDEX "photo_upload_batches_created_by_membership_id_created_at_idx" ON "photo_upload_batches"("created_by_membership_id", "created_at" DESC);
CREATE INDEX "photos_upload_batch_id_display_order_idx" ON "photos"("upload_batch_id", "display_order");
CREATE INDEX "photos_family_id_baby_id_updated_at_id_idx" ON "photos"("family_id", "baby_id", "updated_at" DESC, "id" DESC);
CREATE INDEX "photos_created_by_membership_id_status_updated_at_id_idx" ON "photos"("created_by_membership_id", "status", "updated_at" DESC, "id" DESC);
CREATE INDEX "photos_status_next_processing_at_processing_lease_until_idx" ON "photos"("status", "next_processing_at", "processing_lease_until");
CREATE INDEX "photos_status_purge_after_idx" ON "photos"("status", "purge_after");
CREATE UNIQUE INDEX "photo_variants_object_key_key" ON "photo_variants"("object_key");
CREATE UNIQUE INDEX "photo_variants_photo_id_kind_key" ON "photo_variants"("photo_id", "kind");
CREATE INDEX "photo_variants_photo_id_idx" ON "photo_variants"("photo_id");

ALTER TABLE "photo_upload_batches" ADD CONSTRAINT "photo_upload_batches_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "photo_upload_batches" ADD CONSTRAINT "photo_upload_batches_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "photo_upload_batches" ADD CONSTRAINT "photo_upload_batches_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "family_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "photos" ADD CONSTRAINT "photos_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "photo_upload_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "photos" ADD CONSTRAINT "photos_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "photos" ADD CONSTRAINT "photos_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "photos" ADD CONSTRAINT "photos_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "family_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "photo_variants" ADD CONSTRAINT "photo_variants_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
