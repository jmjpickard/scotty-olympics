-- Add default UUID generation to participants.id
ALTER TABLE "participants" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
