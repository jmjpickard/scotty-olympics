-- Enable the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add invite token fields to participants table
ALTER TABLE "participants" ADD COLUMN "invite_token" TEXT UNIQUE;
ALTER TABLE "participants" ADD COLUMN "invite_token_expiry" TIMESTAMP(3);
