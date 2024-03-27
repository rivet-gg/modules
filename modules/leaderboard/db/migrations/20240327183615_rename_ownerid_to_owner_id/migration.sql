-- CreateTable
CREATE TABLE "Entry" (
    "ownerId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "leaderboardKey" TEXT NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("ownerId","leaderboardKey")
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_leaderboardKey_fkey" FOREIGN KEY ("leaderboardKey") REFERENCES "Leaderboard"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
