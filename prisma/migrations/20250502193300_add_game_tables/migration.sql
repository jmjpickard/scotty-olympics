-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_participants" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "tap_count" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "score_awarded" INTEGER,

    CONSTRAINT "game_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_participants_game_id_participant_id_key" ON "game_participants"("game_id", "participant_id");

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
