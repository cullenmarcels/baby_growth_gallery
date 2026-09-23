CREATE TYPE "MilestoneSource" AS ENUM ('TEMPLATE', 'CUSTOM');
CREATE TYPE "MilestoneState" AS ENUM ('PENDING', 'COMPLETED');

CREATE TABLE "milestones" (
  "id" UUID NOT NULL,
  "family_id" UUID NOT NULL,
  "baby_id" UUID NOT NULL,
  "created_by_membership_id" UUID NOT NULL,
  "source" "MilestoneSource" NOT NULL,
  "template_key" VARCHAR(64),
  "title" VARCHAR(40) NOT NULL,
  "state" "MilestoneState" NOT NULL DEFAULT 'PENDING',
  "reminder_on" DATE,
  "completed_on" DATE,
  "completion_note" VARCHAR(1000),
  "completed_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "milestone_photos" (
  "milestone_id" UUID NOT NULL,
  "photo_id" UUID NOT NULL,
  "display_order" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "milestone_photos_pkey" PRIMARY KEY ("milestone_id", "photo_id")
);

CREATE UNIQUE INDEX "milestones_baby_id_template_key_key" ON "milestones"("baby_id", "template_key");
CREATE INDEX "milestones_family_id_baby_id_state_created_at_id_idx" ON "milestones"("family_id", "baby_id", "state", "created_at" DESC, "id" DESC);
CREATE INDEX "milestones_family_id_baby_id_state_completed_on_completed_at_id_idx" ON "milestones"("family_id", "baby_id", "state", "completed_on" DESC, "completed_at" DESC, "id" DESC);
CREATE INDEX "milestones_family_id_baby_id_state_reminder_on_created_at_id_idx" ON "milestones"("family_id", "baby_id", "state", "reminder_on", "created_at", "id");
CREATE INDEX "milestones_created_by_membership_id_idx" ON "milestones"("created_by_membership_id");
CREATE INDEX "milestone_photos_milestone_id_display_order_idx" ON "milestone_photos"("milestone_id", "display_order");
CREATE INDEX "milestone_photos_photo_id_idx" ON "milestone_photos"("photo_id");

ALTER TABLE "milestones" ADD CONSTRAINT "milestones_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "baby_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "family_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "milestone_photos" ADD CONSTRAINT "milestone_photos_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "milestone_photos" ADD CONSTRAINT "milestone_photos_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
