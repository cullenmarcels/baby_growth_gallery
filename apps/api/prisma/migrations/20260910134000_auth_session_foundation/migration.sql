CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "phone_e164" VARCHAR(16) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" VARCHAR(80),
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "auth_version" INTEGER NOT NULL DEFAULT 1,
    "phone_verified_at" TIMESTAMPTZ(3) NOT NULL,
    "password_changed_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "legal_acceptances" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "terms_version" VARCHAR(40) NOT NULL,
    "privacy_version" VARCHAR(40) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_phone_e164_key" ON "accounts"("phone_e164");
CREATE INDEX "legal_acceptances_account_id_accepted_at_idx" ON "legal_acceptances"("account_id", "accepted_at");

ALTER TABLE "legal_acceptances"
ADD CONSTRAINT "legal_acceptances_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
