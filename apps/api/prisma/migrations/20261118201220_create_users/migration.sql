-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('attendee', 'organiser', 'vendor', 'freelancer', 'admin');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('pending', 'active', 'suspended', 'banned');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cognito_sub" TEXT NOT NULL,
    "email" TEXT,
    "phone" VARCHAR(20),
    "role" "user_role" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_cognito_sub_key" ON "users"("cognito_sub");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

ALTER TABLE "users" ADD CONSTRAINT users_contact_present
CHECK (email IS NOT NULL OR phone IS NOT NULL);
ALTER TABLE "users" ADD CONSTRAINT users_email_lower
CHECK (email IS NULL OR email = lower(email));