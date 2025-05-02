-- AlterTable
ALTER TABLE "participants" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- Add admin flag to existing admin user (replace 'tom@example.com' with actual admin email)
UPDATE "participants" SET "is_admin" = true WHERE "email" = 'tom@example.com';